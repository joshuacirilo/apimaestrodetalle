import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
const server=process.env.API_BASE_URL ? null : spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--port','3100'],{stdio:['ignore','pipe','pipe']});
server?.stdout.on('data',(chunk)=>process.stdout.write(chunk));server?.stderr.on('data',(chunk)=>process.stderr.write(chunk));
const base=process.env.API_BASE_URL ?? 'http://127.0.0.1:3100';
try {
 let ready=false;
 for(let i=0;i<60;i++){try {const r=await fetch(base+'/api/misiones');if(r.status===200){ready=true;break;}}catch{} await new Promise(r=>setTimeout(r,500));}
 assert.ok(ready,'Servidor no disponible');
 for(const [path,type] of [['/api-docs','text/html'],['/api/openapi','application/json'],['/api-docs/assets/swagger-ui.css','text/css'],['/api-docs/assets/swagger-ui-bundle.js','text/javascript']]) {
   const response=await fetch(base+path);
   assert.equal(response.status,200,path);
   assert.ok(response.headers.get('content-type').includes(type));
   if(path==='/api/openapi') {
     const spec=await response.json();
     assert.deepEqual(Object.keys(spec.paths).sort(), ['/api/estudiantes','/api/misiones','/api/registro']);
     assert.equal(spec.servers[0].url,'/');
   } else assert.ok((await response.text()).length>100);
   console.log(path,200);
 }
 assert.equal((await fetch(base+'/api-docs/assets/package.json')).status,404);
 for(const path of ['/api/misiones','/api/estudiantes']){const r=await fetch(base+path);assert.equal(r.status,200);assert.ok(Array.isArray(await r.json()));console.log(path,200);}
 for(const body of ['{',JSON.stringify({}),JSON.stringify({estudiante:{carnet:'TEST',nombre:'Prueba',correo:'prueba@example.invalid'},misiones:[{misionId:2147483647,estado:true}]})]){
 const r=await fetch(base+'/api/registro',{method:'POST',headers:{'content-type':'application/json'},body});assert.equal(r.status,400);console.log('/api/registro',400);}
 const r=await fetch(base+'/api/registro',{method:'POST',body:'{}'});assert.equal(r.status,415);console.log('/api/registro',415);
} finally {server?.kill();}



