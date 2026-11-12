import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,chmodSync,existsSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {randomBytes,randomUUID,createHash,scryptSync,timingSafeEqual} from 'node:crypto';
const DAY=86400000;
export const hash=value=>createHash('sha256').update(value).digest('hex');
const token=()=>randomBytes(32).toString('base64url');
export function createLogStore(directory,{now=Date.now}={}){
 mkdirSync(directory,{recursive:true,mode:0o700});chmodSync(directory,0o700);
 const db=new DatabaseSync(path.join(directory,'conversations.sqlite'));
 chmodSync(path.join(directory,'conversations.sqlite'),0o600);
 db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS players(id TEXT PRIMARY KEY,secret TEXT UNIQUE NOT NULL,csrf TEXT NOT NULL,consent INTEGER NOT NULL DEFAULT 0,created INTEGER NOT NULL,last_seen INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS messages(id TEXT PRIMARY KEY,player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,run_id TEXT NOT NULL,message_id TEXT NOT NULL,nickname TEXT NOT NULL,received INTEGER NOT NULL,updated INTEGER NOT NULL,revision INTEGER,episode INTEGER,node TEXT,hero TEXT,stage TEXT,turn INTEGER,mode TEXT,prompt TEXT,status TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 1,fingerprint TEXT NOT NULL,response TEXT,error TEXT,UNIQUE(player_id,message_id));
 CREATE INDEX IF NOT EXISTS messages_player_time ON messages(player_id,received);
 CREATE INDEX IF NOT EXISTS messages_received ON messages(received);
 CREATE TABLE IF NOT EXISTS admin_sessions(secret TEXT PRIMARY KEY,csrf TEXT NOT NULL,expires INTEGER NOT NULL);
 `);
 // A process restart cannot resume an abandoned provider request.
 db.prepare("UPDATE messages SET status='failed',error='서버 재시작으로 중단됨' WHERE status='pending'").run();
 const credentialFile=path.join(directory,'admin-auth.json');
 let credentials;
 if(existsSync(credentialFile))credentials=JSON.parse(readFileSync(credentialFile,'utf8'));
 else{
  const password=process.env.ADMIN_PASSWORD||token();const salt=token();credentials={salt,digest:scryptSync(password,salt,64).toString('hex')};
  writeFileSync(credentialFile,JSON.stringify(credentials),{mode:0o600,flag:'wx'});
  if(!process.env.ADMIN_PASSWORD)writeFileSync(path.join(directory,'관리자-접속정보.txt'),`관리자 주소: /admin\n관리자 비밀번호: ${password}\n\n이 파일은 다른 사람에게 공유하지 마세요. 공개 폴더 밖에 보관되어 있습니다.\n비밀번호 변경: 서버를 종료한 뒤 node scripts/admin-password.mjs 실행\n`,{mode:0o600,flag:'wx'});
 }
 let failures=[];
 function cleanup(){const cutoff=now()-30*DAY;db.prepare('DELETE FROM messages WHERE received<?').run(cutoff);db.prepare('DELETE FROM players WHERE last_seen<? AND NOT EXISTS(SELECT 1 FROM messages WHERE player_id=players.id)').run(cutoff);db.prepare('DELETE FROM admin_sessions WHERE expires<?').run(now());}
 cleanup();
 return {
  db,cleanup,close:()=>db.close(),
  player(secret){return secret?db.prepare('SELECT * FROM players WHERE secret=?').get(hash(secret)):null;},
  createPlayer(){const secret=token(),p={id:randomUUID(),csrf:token()};db.prepare('INSERT INTO players VALUES(?,?,?,0,?,?)').run(p.id,hash(secret),p.csrf,now(),now());return {...p,secret,consent:0};},
  consent(id,value){db.prepare('UPDATE players SET consent=?,last_seen=? WHERE id=?').run(value?1:0,now(),id);},
  login(password){failures=failures.filter(t=>t>now()-15*60000);if(failures.length>=5)return {limited:true};const digest=scryptSync(password,credentials.salt,64);if(!timingSafeEqual(digest,Buffer.from(credentials.digest,'hex'))){failures.push(now());return null;}failures=[];const secret=token(),csrf=token();db.prepare('INSERT INTO admin_sessions VALUES(?,?,?)').run(hash(secret),csrf,now()+8*3600000);return {secret,csrf};},
  admin(secret){return secret?db.prepare('SELECT csrf FROM admin_sessions WHERE secret=? AND expires>?').get(hash(secret),now()):null;},
  logout(secret){if(secret)db.prepare('DELETE FROM admin_sessions WHERE secret=?').run(hash(secret));},
  begin(player,input,meta){
   cleanup();const fingerprint=hash(JSON.stringify(input));let row=db.prepare('SELECT * FROM messages WHERE player_id=? AND message_id=?').get(player.id,meta.messageId);
   if(row){if(row.fingerprint!==fingerprint||row.run_id!==meta.runId)throw Object.assign(Error('재시도 내용이 바뀌었어요. 새 메시지로 전송해 주세요.'),{status:409});db.prepare('UPDATE messages SET attempts=attempts+1,updated=? WHERE id=?').run(now(),row.id);return row;}
   const id=randomUUID();db.prepare(`INSERT INTO messages(id,player_id,run_id,message_id,nickname,received,updated,revision,episode,node,hero,stage,turn,mode,prompt,status,fingerprint) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'pending',?)`).run(id,player.id,meta.runId,meta.messageId,input.name,now(),now(),meta.storyRevision,meta.episode,meta.nodeId,input.hero,input.stage,input.turn,input.mode,input.text,fingerprint);
   db.prepare('UPDATE players SET last_seen=? WHERE id=?').run(now(),player.id);return {id,status:'new'};
  },
  pending(id){db.prepare("UPDATE messages SET status='pending',error=NULL,updated=? WHERE id=?").run(now(),id);},
  complete(id,response){db.prepare("UPDATE messages SET status='succeeded',response=?,error=NULL,updated=? WHERE id=?").run(JSON.stringify(response),now(),id);},
  fail(id,error){db.prepare("UPDATE messages SET status='failed',error=?,updated=? WHERE id=?").run(error,now(),id);},
  list(filters){
   cleanup();const where=[],params=[];const exact={player:'m.player_id',run:'m.run_id',hero:'m.hero',stage:'m.stage',mode:'m.mode',status:'m.status',episode:'m.episode'};
   for(const [key,col] of Object.entries(exact))if(filters[key]){where.push(`${col}=?`);params.push(filters[key]);}
   if(filters.q){where.push('(instr(m.nickname,?)>0 OR instr(m.prompt,?)>0)');params.push(filters.q,filters.q);}
   if(filters.from){const time=Date.parse(filters.from);if(Number.isFinite(time)){where.push('m.received>=?');params.push(time);}}
   if(filters.to){const time=Date.parse(filters.to);if(Number.isFinite(time)){where.push('m.received<?');params.push(time+DAY);}}
   const clause=where.length?'WHERE '+where.join(' AND '):'';const offset=Math.max(0,Math.min(1000000,Number(filters.offset)||0));
   const total=db.prepare(`SELECT count(*) AS n FROM messages m ${clause}`).get(...params).n;
   const rows=db.prepare(`SELECT m.* FROM messages m ${clause} ORDER BY m.received DESC,m.id LIMIT 100 OFFSET ?`).all(...params,offset).map(({fingerprint,response,...r})=>({...r,response:response?JSON.parse(response):null}));
   const players=db.prepare(`SELECT m.player_id,max(m.received) last_seen,count(*) count,group_concat(DISTINCT m.nickname) nicknames FROM messages m ${clause} GROUP BY m.player_id ORDER BY last_seen DESC LIMIT 200`).all(...params);
   const runs=filters.player?db.prepare('SELECT run_id,min(received) first_seen,max(received) last_seen,count(*) count FROM messages WHERE player_id=? GROUP BY run_id ORDER BY last_seen DESC LIMIT 200').all(filters.player):[];
   return {total,rows,players,runs,offset,hasMore:offset+rows.length<total,retentionDays:30};
  },
  removePlayer(id){db.prepare('DELETE FROM players WHERE id=?').run(id);}
 };
}
