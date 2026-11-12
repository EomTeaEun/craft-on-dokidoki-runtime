import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const files=['server.mjs',...['public','src','scripts','api'].flatMap(dir=>readdirSync(dir).filter(f=>/\.(m?js)$/.test(f)).map(f=>dir+'/'+f))];
for(const file of files){const r=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);}
console.log(`Checked ${files.length} JavaScript modules.`);
