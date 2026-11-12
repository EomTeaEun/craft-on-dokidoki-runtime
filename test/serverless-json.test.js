import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readJSON} from '../src/log-routes.js';
test('preparsed platform requests obey the same JSON size limit as local streams',async()=>{
 assert.deepEqual(await readJSON({body:{accept:true}}),{accept:true});
 assert.deepEqual(await readJSON({body:'{"accept":false}'}),{accept:false});
 await assert.rejects(()=>readJSON({body:{text:'가'.repeat(40)}},{maxBytes:50}),e=>e.status===413);
 await assert.rejects(()=>readJSON({body:'{'}),e=>e.status===400);
});
