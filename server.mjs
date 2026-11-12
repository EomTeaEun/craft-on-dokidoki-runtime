import {CHAT_REQUEST_MAX_BYTES} from './public/chat-memory.js';
import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {inputSchema,demoReply,liveReply} from './src/dialogue.js';
import {createLogStore} from './src/log-store.js';
import {logRoutes,logMeta,readJSON,cookie} from './src/log-routes.js';
import {aiStatus} from './src/openai.js';

const root=path.dirname(fileURLToPath(import.meta.url));
const direct=!!process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
const cloudRuntime=!!process.env.VERCEL&&!direct;
const runtimeEnv={...process.env};
for(const file of ['.env.local','.env']){try{process.loadEnvFile(path.join(root,file));}catch(e){if(e.code!=='ENOENT')throw e;}}
Object.assign(process.env,runtimeEnv);
const publicRoot=path.join(root,'public');
const port=Number(process.env.PORT)||3210;
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.mp3':'audio/mpeg','.webp':'image/webp'};
const cache=new Map();
const logs=process.env.DATABASE_URL&&!process.env.GAME_DATA_DIR
 ?await (await import('./src/postgres-log-store.js')).createPostgresLogStore()
 :createLogStore(process.env.GAME_DATA_DIR||path.join(root,'private-data'));
const handleLogRoute=logRoutes(logs,{json,secure:cloudRuntime||process.env.PUBLIC_ORIGIN?.startsWith('https:')});
const retentionTimer=cloudRuntime?null:setInterval(()=>{Promise.resolve(logs.cleanup()).catch(()=>console.error('[logs] retention failed'));},3600000);retentionTimer?.unref();

function json(res,code,value){res.writeHead(code,{'Content-Type':MIME['.json'],'Cache-Control':'no-store'});res.end(JSON.stringify(value));}
function localRequest(req){const origins=[`http://127.0.0.1:${port}`,`http://localhost:${port}`,...([process.env.PUBLIC_ORIGIN,process.env.VERCEL_URL&&'https://'+process.env.VERCEL_URL,process.env.VERCEL_PROJECT_PRODUCTION_URL&&'https://'+process.env.VERCEL_PROJECT_PRODUCTION_URL].filter(Boolean).map(o=>new URL(o).origin))];if(!origins.some(o=>new URL(o).host===req.headers.host))return false;if(req.headers['sec-fetch-site']==='cross-site')return false;return !req.headers.origin||origins.includes(req.headers.origin);}
export const server=http.createServer(async(req,res)=>{
 try{
  if(!localRequest(req))return json(res,403,{error:'로컬 게임에서만 요청할 수 있어요.'});
  const url=new URL(req.url,`http://127.0.0.1:${port}`);
  if(await handleLogRoute(req,res,url))return;
  if(url.pathname==='/api/status'&&req.method==='GET')return json(res,200,{game:'love-exception',...aiStatus(),version:1});
  if(url.pathname==='/api/chat'&&req.method==='POST'){
   const value=await readJSON(req,{maxBytes:CHAT_REQUEST_MAX_BYTES});
   const parsed=inputSchema.safeParse(value);
   if(!parsed.success)return json(res,400,{error:'대화 정보를 확인할 수 없어요. 저장한 게임을 다시 불러와 주세요.'});
   const meta=logMeta.safeParse(value.logging);
   if(!meta.success)return json(res,400,{error:'대화 식별 정보를 새로 확인해 주세요. 페이지를 새로고침하면 됩니다.'});
   const player=await logs.player(cookie(req,'vn_player'));
   if(!player?.consent||req.headers['x-csrf-token']!==player.csrf)return json(res,403,{error:'대화 기록 안내를 확인하고 동의한 후 전송할 수 있어요.',consentRequired:true});
   const input=parsed.data;
   // Durable acceptance happens before any paid provider request.
   const row=await logs.begin(player,input,meta.data);
   if(row.status==='succeeded')return json(res,200,JSON.parse(row.response));
   if(input.mode==='live'&&!aiStatus().liveReady){await logs.fail(row.id,'OpenAI 키 미설정');return json(res,503,{error:'OpenAI API 키가 아직 설정되지 않았어요. .env.local의 OPENAI_API_KEY를 확인해 주세요.'});}
   let promise=cache.get(row.id);
   if(!promise){
    await logs.pending(row.id);
    promise=(async()=>{try{const result=input.mode==='live'?await liveReply(input):demoReply(input);await logs.complete(row.id,result);return result;}catch(error){await logs.fail(row.id,'응답 처리 실패');throw error;}})();
    cache.set(row.id,promise);
   }
   try{return json(res,200,await promise);}catch(error){console.error('[chat]',error.name);return json(res,502,{error:'답변을 받지 못했어요. 입력은 남겨 두었으니 다시 전송해 주세요. 연결 설정과 API 잔액도 확인해 주세요.'});}finally{cache.delete(row.id);}
  }
  if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'지원하지 않는 요청입니다.'});
  let pathname;try{pathname=decodeURIComponent(url.pathname);}catch{return json(res,400,{error:'잘못된 경로입니다.'});}
  const file=path.resolve(publicRoot,'.'+(pathname==='/'?'/index.html':pathname==='/admin'?'/admin.html':pathname));
  if(!file.startsWith(publicRoot+path.sep))return json(res,404,{error:'파일을 찾을 수 없어요.'});
  const info=await stat(file);if(!info.isFile())return json(res,404,{error:'파일을 찾을 수 없어요.'});
  res.setHeader('Content-Type',MIME[path.extname(file)]||'application/octet-stream');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Cache-Control',pathname.startsWith('/assets/')?'public, max-age=3600':'no-cache');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob:; media-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
  if(range){const start=Number(range[1]),end=range[2]?Math.min(Number(range[2]),info.size-1):info.size-1;if(start>end||start>=info.size){res.writeHead(416,{'Content-Range':`bytes */${info.size}`});return res.end();}res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${info.size}`,'Content-Length':end-start+1,'Accept-Ranges':'bytes'});if(req.method==='HEAD')return res.end();return createReadStream(file,{start,end}).pipe(res);}
  res.writeHead(200,{'Content-Length':info.size,'Accept-Ranges':'bytes'});
  if(req.method==='HEAD')return res.end();createReadStream(file).pipe(res);
 }catch(e){if(!res.headersSent)json(res,e.status||(e.code==='ENOENT'?404:500),{error:e.status?e.message:e.code==='ENOENT'?'파일을 찾을 수 없어요.':'요청을 저장하거나 처리하지 못했어요. 입력은 유지됩니다.'});else res.end();}
});
server.on('close',()=>{clearInterval(retentionTimer);logs.close();});
if(direct)server.listen(port,process.env.HOST||'127.0.0.1',()=>console.log(`\n연애 플래그는 예외 처리되지 않습니다\nhttp://127.0.0.1:${port}\n${aiStatus().liveReady?'OpenAI 연결 준비됨':'체험 모드 · OpenAI 키 미설정'}\n`));
