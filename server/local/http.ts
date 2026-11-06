import {createServer} from 'node:http';
import type {LocalPhysical} from './service.ts';
export interface SerialControls {list:()=>Promise<{path:string;label:string}[]>;connect:(path:string)=>Promise<void>;disconnect:()=>void|Promise<void>}
export function localApi(service:LocalPhysical,serial?:SerialControls){return createServer(async(req,res)=>{
 const reply=(status:number,body:unknown)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));};
 try{const host=req.headers.host??'';if(!/^(127\.0\.0\.1|localhost):\d+$/.test(host))return reply(403,{error:'Local host required'});
 const url=new URL(req.url??'/',`http://${host}`),path=url.pathname;
 if(path.startsWith('/api/physical/serial/')){
  if(!serial)return reply(503,{error:'Serial controls unavailable; restart the local receiver'});
  if(req.method==='GET'&&path==='/api/physical/serial/ports')return reply(200,{ports:await serial.list()});
  if(req.method!=='POST')return reply(405,{error:'Use POST'});
  if(!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(req.headers.origin??''))return reply(403,{error:'Local browser origin required'});
  if(!req.headers['content-type']?.startsWith('application/json'))return reply(415,{error:'Use application/json'});
  let raw='';for await(const part of req){raw+=part.toString();if(Buffer.byteLength(raw)>256)return reply(413,{error:'Body too large'});}
  let body;try{body=JSON.parse(raw);}catch{return reply(400,{error:'Invalid JSON'});}
  if(path==='/api/physical/serial/disconnect'){await serial.disconnect();return reply(200,{message:'Receiver disconnected'});}
  if(path==='/api/physical/serial/connect'){if(!/^COM\d+$/i.test(body?.path??''))return reply(400,{error:'Select a detected COM port'});try{await serial.connect(body.path);return reply(202,{message:'Connection requested; watch receiver status for success or errors'});}catch(e){return reply(409,{error:e instanceof Error?e.message:'Connection failed'});}}
  return reply(404,{error:'Unknown serial control'});
 }
 if(req.method==='GET'&&path==='/api/physical/health')return reply(service.storageError?503:200,{receiver:service.snapshot().receiver,storage:service.storageError?'ERROR':'OK'});
 if(req.method==='GET'&&path==='/api/physical')return reply(200,service.snapshot());
 const match=/^\/api\/physical\/(history|calibration)\/(BIN-00[1-4])$/.exec(path);
 if(!match)return reply(404,{error:'Unknown local physical endpoint'});
 if(req.method==='GET'){const limit=Number(url.searchParams.get('limit')??30);if(!Number.isInteger(limit)||limit<1||limit>100)return reply(400,{error:'History limit must be 1–100'});return reply(200,match[1]==='history'?{history:service.store.history(match[2],limit)}:{calibration:service.store.calibration(match[2])});}
 if(req.method!=='PUT'||match[1]!=='calibration')return reply(405,{error:'Method not allowed'});
 const origin=req.headers.origin;if(origin&&!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin))return reply(403,{error:'Local origin required'});
 if(!req.headers['content-type']?.startsWith('application/json'))return reply(415,{error:'Use application/json'});
 let body='';for await(const part of req){body+=part.toString();if(Buffer.byteLength(body)>1024)return reply(413,{error:'Calibration body too large'});}
 try{service.store.calibrate(match[2],JSON.parse(body));return reply(200,{calibration:service.store.calibration(match[2])});}catch(e){return reply(400,{error:e instanceof Error?e.message:'Invalid calibration'});}
 }catch{return reply(503,{error:'Local physical storage unavailable; last displayed observations are not fresh'});}
 });}
