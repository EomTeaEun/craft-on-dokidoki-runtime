import {z} from 'zod';
export const logMeta=z.object({runId:z.uuid(),messageId:z.uuid(),storyRevision:z.number().int().min(1).max(4),episode:z.number().int().min(0).max(7),nodeId:z.string().max(100)});
export const cookie=(req,name)=>{const parts=(req.headers.cookie||'').split(';').map(p=>p.trim());return parts.find(p=>p.startsWith(name+'='))?.slice(name.length+1);};
export const setCookie=(res,name,value,{secure=false,maxAge=2592000}={})=>res.setHeader('Set-Cookie',`${name}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure?'; Secure':''}`);
export async function readJSON(req,{maxBytes=65536}={}){
 let body='',size=0;
 // Vercel may have parsed the request before forwarding it to the Node handler.
 if(req.body!==undefined){body=typeof req.body==='string'?req.body:JSON.stringify(req.body);size=Buffer.byteLength(body);}
 else for await(const chunk of req){size+=chunk.length;if(size>maxBytes)throw Object.assign(Error('요청이 너무 길어요.'),{status:413});body+=chunk;}
 if(size>maxBytes)throw Object.assign(Error('요청이 너무 길어요.'),{status:413});
 try{return JSON.parse(body);}catch{throw Object.assign(Error('올바른 요청이 아니에요.'),{status:400});}
}
export function logRoutes(store,{json,secure=false}){
 return async(req,res,url)=>{
  const p=url.pathname,write=!['GET','HEAD'].includes(req.method);
  if(p==='/api/player/session'&&req.method==='GET'){
   let player=await store.player(cookie(req,'vn_player'));if(!player){player=await store.createPlayer();setCookie(res,'vn_player',player.secret,{secure});}
   json(res,200,{playerId:player.id,csrf:player.csrf,consent:!!player.consent,retentionDays:30});return true;
  }
  if(p==='/api/player/consent'&&req.method==='POST'){
   const player=await store.player(cookie(req,'vn_player'));if(!player||req.headers['x-csrf-token']!==player.csrf){json(res,403,{error:'대화 기록 설정을 다시 열어 주세요.'});return true;}
   const body=await readJSON(req);if(typeof body.accept!=='boolean'){json(res,400,{error:'동의 여부를 확인해 주세요.'});return true;}
   await store.consent(player.id,body.accept);json(res,200,{consent:body.accept});return true;
  }
  if(!p.startsWith('/api/admin/'))return false;
  if(p==='/api/admin/login'&&req.method==='POST'){
   const body=await readJSON(req);if(typeof body.password!=='string'||body.password.length>256){json(res,400,{error:'비밀번호를 확인해 주세요.'});return true;}
   const session=await store.login(body.password);
   if(!session||session.limited){json(res,session?.limited?429:401,{error:session?.limited?'잠시 후 다시 시도해 주세요. 로그인 시도는 15분에 5회까지입니다.':'비밀번호가 맞지 않습니다.'});return true;}
   setCookie(res,'vn_admin',session.secret,{secure,maxAge:8*3600});json(res,200,{csrf:session.csrf});return true;
  }
  const secret=cookie(req,'vn_admin'),admin=await store.admin(secret);
  if(!admin){json(res,401,{error:'관리자 로그인이 필요합니다.'});return true;}
  if(write&&req.headers['x-csrf-token']!==admin.csrf){json(res,403,{error:'로그인 정보를 새로 확인해 주세요.'});return true;}
  if(p==='/api/admin/session'&&req.method==='GET')json(res,200,{csrf:admin.csrf});
  else if(p==='/api/admin/logs'&&req.method==='GET')json(res,200,await store.list(Object.fromEntries(url.searchParams)));
  else if(p==='/api/admin/logout'&&req.method==='POST'){await store.logout(secret);setCookie(res,'vn_admin','',{secure,maxAge:0});json(res,200,{ok:true});}
  else if(p==='/api/admin/player'&&req.method==='DELETE'){
   const id=url.searchParams.get('id');if(!z.uuid().safeParse(id).success)json(res,400,{error:'플레이어를 확인해 주세요.'});else{await store.removePlayer(id);json(res,200,{ok:true});}
  }else json(res,404,{error:'없는 관리자 요청입니다.'});
  return true;
 };
}
