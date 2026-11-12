// Stop the game server before rotating credentials. No secret is printed to the terminal.
import {randomBytes,scryptSync} from 'node:crypto';
import {writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
for(const file of ['.env.local','.env']){try{process.loadEnvFile(path.join(root,file));}catch(e){if(e.code!=='ENOENT')throw e;}}
const dir=process.env.GAME_DATA_DIR||path.join(root,'private-data');await mkdir(dir,{recursive:true,mode:0o700});
const password=process.env.ADMIN_PASSWORD||randomBytes(24).toString('base64url'),salt=randomBytes(32).toString('hex');
await writeFile(path.join(dir,'admin-auth.json'),JSON.stringify({salt,digest:scryptSync(password,salt,64).toString('hex')}),{mode:0o600});
await writeFile(path.join(dir,'관리자-접속정보.txt'),`관리자 주소: /admin\n관리자 비밀번호: ${password}\n다른 사람에게 공유하지 마세요.\n`,{mode:0o600});
const db=new DatabaseSync(path.join(dir,'conversations.sqlite'));try{db.exec('DELETE FROM admin_sessions');}catch{}db.close();
console.log('관리자 비밀번호를 갱신했습니다. private-data/관리자-접속정보.txt에서 확인하세요. 서버를 다시 시작하면 적용됩니다.');
