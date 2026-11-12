import {neon} from '@neondatabase/serverless';
import {randomBytes,randomUUID,createHash,scryptSync,timingSafeEqual} from 'node:crypto';

const DAY=86400000;
const token=()=>randomBytes(32).toString('base64url');
const hash=value=>createHash('sha256').update(value).digest('hex');
const error=(message,status=409)=>Object.assign(new Error(message),{status});

// The deployed game uses a dedicated database; local downloads still use SQLite.
export async function createPostgresLogStore({url=process.env.DATABASE_URL,password=process.env.ADMIN_PASSWORD,now=Date.now}={}){
 if(!password)throw new Error('ADMIN_PASSWORD is required for the deployed log store');
 const sql=neon(url),query=(text,values=[])=>sql.query(text,values);
 const definitions=[
  `CREATE TABLE IF NOT EXISTS vn_players(id TEXT PRIMARY KEY,secret TEXT UNIQUE NOT NULL,csrf TEXT NOT NULL,consent INTEGER NOT NULL DEFAULT 0,created DOUBLE PRECISION NOT NULL,last_seen DOUBLE PRECISION NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS vn_messages(id TEXT PRIMARY KEY,player_id TEXT NOT NULL REFERENCES vn_players(id) ON DELETE CASCADE,run_id TEXT NOT NULL,message_id TEXT NOT NULL,nickname TEXT NOT NULL,received DOUBLE PRECISION NOT NULL,updated DOUBLE PRECISION NOT NULL,revision INTEGER,episode INTEGER,node TEXT,hero TEXT,stage TEXT,turn INTEGER,mode TEXT,prompt TEXT,status TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 1,fingerprint TEXT NOT NULL,response TEXT,error TEXT,UNIQUE(player_id,message_id))`,
  `CREATE INDEX IF NOT EXISTS vn_messages_player_time ON vn_messages(player_id,received)`,
  `CREATE INDEX IF NOT EXISTS vn_messages_received ON vn_messages(received)`,
  `CREATE TABLE IF NOT EXISTS vn_admin_sessions(secret TEXT PRIMARY KEY,csrf TEXT NOT NULL,expires DOUBLE PRECISION NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS vn_admin_attempts(id TEXT PRIMARY KEY,received DOUBLE PRECISION NOT NULL)`
 ];
 await sql.transaction(definitions.map(text=>sql.query(text)));
 const salt='dokidoki-runtime-admin-v1',adminDigest=scryptSync(password,salt,64);
 let cleanedAt=-Infinity;
 async function cleanup(){
  if(now()-cleanedAt<3600000)return;
  const t=now(),cutoff=t-30*DAY;
  await sql.transaction([
   sql.query('DELETE FROM vn_messages WHERE received<$1',[cutoff]),
   sql.query('DELETE FROM vn_players WHERE last_seen<$1 AND NOT EXISTS(SELECT 1 FROM vn_messages WHERE player_id=vn_players.id)',[cutoff]),
   sql.query('DELETE FROM vn_admin_sessions WHERE expires<$1',[t]),
   sql.query('DELETE FROM vn_admin_attempts WHERE received<$1',[t-15*60000])
  ]);
  cleanedAt=t;
 }
 await cleanup();
 return {
  cleanup,close(){},
  async player(secret){return secret?(await query('SELECT * FROM vn_players WHERE secret=$1 AND last_seen>=$2',[hash(secret),now()-30*DAY]))[0]:undefined;},
  async createPlayer(){
   const secret=token(),p={id:randomUUID(),csrf:token()};
   await query('INSERT INTO vn_players VALUES($1,$2,$3,0,$4,$4)',[p.id,hash(secret),p.csrf,now()]);
   return {...p,secret,consent:0};
  },
  async consent(id,value){await query('UPDATE vn_players SET consent=$1,last_seen=$2 WHERE id=$3',[value?1:0,now(),id]);},
  async login(value){
   // A database row records each attempt before checking the password, across instances.
   const rows=await query('INSERT INTO vn_admin_attempts VALUES($1,$2) RETURNING (SELECT count(*) FROM vn_admin_attempts WHERE received>$3) AS previous',[randomUUID(),now(),now()-15*60000]);
   if(Number(rows[0].previous)>=5)return {limited:true};
   if(!timingSafeEqual(scryptSync(value,salt,64),adminDigest))return null;
   const secret=token(),csrf=token();
   await query('INSERT INTO vn_admin_sessions VALUES($1,$2,$3)',[hash(secret),csrf,now()+8*3600000]);
   return {secret,csrf};
  },
  async admin(secret){return secret?(await query('SELECT csrf FROM vn_admin_sessions WHERE secret=$1 AND expires>$2',[hash(secret),now()]))[0]:undefined;},
  async logout(secret){if(secret)await query('DELETE FROM vn_admin_sessions WHERE secret=$1',[hash(secret)]);},
  async begin(player,input,meta){
   await cleanup();
   const t=now(),fingerprint=hash(JSON.stringify(input)),id=randomUUID();
   const inserted=await query(`INSERT INTO vn_messages(id,player_id,run_id,message_id,nickname,received,updated,revision,episode,node,hero,stage,turn,mode,prompt,status,fingerprint) VALUES($1,$2,$3,$4,$5,$6,$6,$7,$8,$9,$10,$11,$12,$13,$14,'pending',$15) ON CONFLICT(player_id,message_id) DO NOTHING RETURNING *`,[id,player.id,meta.runId,meta.messageId,input.name,t,meta.storyRevision,meta.episode,meta.nodeId,input.hero,input.stage,input.turn,input.mode,input.text,fingerprint]);
   if(inserted.length){await query('UPDATE vn_players SET last_seen=$1 WHERE id=$2',[t,player.id]);return {...inserted[0],status:'new'};}
   const row=(await query('SELECT * FROM vn_messages WHERE player_id=$1 AND message_id=$2',[player.id,meta.messageId]))[0];
   if(!row||row.fingerprint!==fingerprint||row.run_id!==meta.runId)throw error('재시도 내용이 바뀌었어요. 새 메시지로 전송해 주세요.');
   if(row.status==='succeeded')return row;
   // A timed-out invocation can be retried, but two instances cannot claim it together.
   const claimed=await query(`UPDATE vn_messages SET status='pending',error=NULL,attempts=attempts+1,updated=$1 WHERE id=$2 AND (status='failed' OR (status='pending' AND updated<$3)) RETURNING *`,[t,row.id,t-120000]);
   if(!claimed.length)throw error('답변을 처리하고 있어요. 잠시 후 다시 확인해 주세요.');
   return {...claimed[0],status:'new'};
  },
  async pending(id){await query("UPDATE vn_messages SET status='pending',error=NULL,updated=$1 WHERE id=$2",[now(),id]);},
  async complete(id,response){await query("UPDATE vn_messages SET status='succeeded',response=$1,error=NULL,updated=$2 WHERE id=$3",[JSON.stringify(response),now(),id]);},
  async fail(id,message){await query("UPDATE vn_messages SET status='failed',error=$1,updated=$2 WHERE id=$3",[message,now(),id]);},
  async list(filters={}){
   await cleanup();
   const values=[now()-30*DAY],where=['m.received>=$1'];
   const param=value=>{values.push(value);return '$'+values.length;};
   const exact={player:'m.player_id',run:'m.run_id',hero:'m.hero',stage:'m.stage',mode:'m.mode',status:'m.status',episode:'m.episode'};
   for(const [key,col] of Object.entries(exact))if(filters[key])where.push(`${col}=${param(filters[key])}`);
   if(filters.q){const p=param(filters.q);where.push(`(position(${p} in m.nickname)>0 OR position(${p} in m.prompt)>0)`);}
   for(const [key,op,offset] of [['from','>=',0],['to','<',DAY]])if(filters[key]){const t=Date.parse(filters[key]);if(Number.isFinite(t))where.push(`m.received${op}${param(t+offset)}`);}
   const clause='WHERE '+where.join(' AND '),offset=Math.max(0,Math.min(1000000,Number(filters.offset)||0));
   const [counts,records,players]=await sql.transaction([
    sql.query(`SELECT count(*) AS n FROM vn_messages m ${clause}`,values),
    sql.query(`SELECT m.* FROM vn_messages m ${clause} ORDER BY m.received DESC,m.id LIMIT 100 OFFSET $${values.length+1}`,[...values,offset]),
    sql.query(`SELECT m.player_id,max(m.received) last_seen,count(*) count,string_agg(DISTINCT m.nickname,',') nicknames FROM vn_messages m ${clause} GROUP BY m.player_id ORDER BY last_seen DESC LIMIT 200`,values)
   ]);
   const total=Number(counts[0].n),rows=records.map(({fingerprint,response,...r})=>({...r,response:response?JSON.parse(response):null}));
   const runs=filters.player?await query('SELECT run_id,min(received) first_seen,max(received) last_seen,count(*) count FROM vn_messages WHERE player_id=$1 AND received>=$2 GROUP BY run_id ORDER BY last_seen DESC LIMIT 200',[filters.player,now()-30*DAY]):[];
   return {total,rows,players:players.map(p=>({...p,count:Number(p.count)})),runs:runs.map(r=>({...r,count:Number(r.count)})),offset,hasMore:offset+rows.length<total,retentionDays:30};
  },
  async removePlayer(id){await query('DELETE FROM vn_players WHERE id=$1',[id]);}
 };
}
