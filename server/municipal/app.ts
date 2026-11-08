import express from 'express';
import type {Request,Response,NextFunction} from 'express';
import {randomUUID} from 'node:crypto';
import {parseCity} from '../../src/core/model';
import type {ArchiveRecord,CityRecord,MunicipalStore,SessionRecord} from './store';
import {hashToken,token,validHash,verifyPassword} from './auth';
import {planCollection} from '../../src/core/routing';
import {startSimulation,advance} from '../../src/core/simulation';
import {authorizeDevice,buildBatch,cloudSnapshot,type TelemetryConfig} from './cloudTelemetry';

export const ENGINE_VERSION='f3-terminal-boundary-v2';
export function canonical(value:unknown):string {return JSON.stringify(value,(_k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);}

export interface ApiConfig {origin:string;username:string;passwordHash:string;workspaceId:string;secureCookies:boolean;telemetry?:TelemetryConfig}
class ApiError extends Error {constructor(public status:number,public code:string,message:string){super(message);}}
const fail=(status:number,code:string,message:string):never=>{throw new ApiError(status,code,message);};
export function createMunicipalApp(store:MunicipalStore,config:ApiConfig){
 const localDemoAllowed=!config.secureCookies&&/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(config.origin);
 if(!validHash(config.passwordHash,localDemoAllowed)||!config.username||!config.workspaceId||new URL(config.origin).origin!==config.origin)throw Error('Invalid operator/API configuration; public/production use requires a strong password hash');
 if(config.secureCookies&&!config.origin.startsWith('https://'))throw Error('Secure deployment requires HTTPS');
 const app=express(),sessions=new WeakMap<Request,SessionRecord>(),attempts=new Map<string,{count:number;expires:number}>();
 app.disable('x-powered-by');
 app.use((req,res,next)=>{res.set({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});next();});
 app.post('/api/telemetry/ingest', (req, _res, next) => {
  if (!config.telemetry || !store.telemetry) return next(new ApiError(503,'TELEMETRY_DISABLED','Wi-Fi telemetry is unavailable'));
  if (!authorizeDevice(config.telemetry, req.headers.authorization)) return next(new ApiError(401,'DEVICE_AUTH','Invalid device credentials'));
  if (!req.is('application/json')) return next(new ApiError(415,'CONTENT_TYPE','Use application/json'));
  next();
 }, express.json({limit:'8kb',strict:true}), async (req,res) => {
  let batch;
  try { batch = buildBatch(req.body, config.workspaceId, config.telemetry!); }
  catch { return fail(422,'TELEMETRY','Invalid sensor batch, mapping or timestamp'); }
  const result = await store.telemetry!.save(batch);
  if (result === 'limited') { res.set('Retry-After','5'); return fail(429,'DEVICE_RATE','Send at most one batch per five-second window'); }
  if (result === 'conflict') return fail(409,'READING_ID','Reading ID already belongs to a different observation');
  res.status(result === 'stored' ? 201 : 200).json({data:{status:result, batchId:batch._id}});
 });
 app.use('/api', (req,res,next)=>{
  if(!['GET','HEAD'].includes(req.method)&&req.headers.origin!==config.origin)return next(new ApiError(403,'ORIGIN','Open the API through the configured application origin'));
  next();
 });
 app.use(express.json({limit:'2mb',strict:true}));
 app.get('/api/health',(_req,res)=>res.json({data:{status:'running'},meta:{service:'municipal'}}));
 app.get('/api/ready',async(_req,res)=>{await store.ready();res.json({data:{database:'ready'},meta:{}});});
 const cookie=(req:Request)=>{const raw=(req.headers.cookie??'').split(';').map(s=>s.trim()).find(s=>s.startsWith('cleancity_session='))?.slice(18);return raw&&/^[a-f0-9]{64}$/.test(raw)?raw:null;};
 const options={httpOnly:true,secure:config.secureCookies,sameSite:'strict' as const,path:'/api',maxAge:8*60*60*1000};
 app.post('/api/session',async(req,res)=>{
  const now=Date.now();for(const [key,a]of attempts)if(a.expires<=now)attempts.delete(key);
  const key=req.socket.remoteAddress??'unknown';const a=attempts.get(key)??{count:0,expires:now+15*60000};
  if(a.count>=8||attempts.size>=10000)fail(429,'RATE_LIMIT','Too many login attempts; try later');a.count++;attempts.set(key,a);
  if(req.body?.username!==config.username||!await verifyPassword(req.body?.password,config.passwordHash))fail(401,'AUTH','Invalid operator credentials');
  const prior=cookie(req);if(prior)await store.deleteSession(hashToken(prior));
  const raw=token(),s={_id:hashToken(raw),workspaceId:config.workspaceId,csrf:token(),expiresAt:new Date(now+options.maxAge)};
  await store.createSession(s);attempts.delete(key);res.cookie('cleancity_session',raw,options).json({data:{csrf:s.csrf,expiresAt:s.expiresAt},meta:{}});
 });
 app.use('/api',async(req,res,next)=>{
  const raw=cookie(req);const s=raw?await store.session(hashToken(raw)):null;
  if(!s||s.expiresAt.getTime()<=Date.now())return next(new ApiError(401,'AUTH','Sign in to the municipal database'));
  if(!['GET','HEAD'].includes(req.method)&&req.headers['x-csrf-token']!==s.csrf)return next(new ApiError(403,'CSRF','Refresh your operator session'));
  sessions.set(req,s);next();
 });
 app.get('/api/session',(req,res)=>{const s=sessions.get(req)!;res.json({data:{csrf:s.csrf,expiresAt:s.expiresAt},meta:{}});});
 app.delete('/api/session',async(req,res)=>{await store.deleteSession(sessions.get(req)!._id);res.clearCookie('cleancity_session',{...options,maxAge:undefined});res.status(204).end();});
 const workspace=(req:Request)=>sessions.get(req)!.workspaceId;
 app.get('/api/telemetry/snapshot', async (req,res) => {
  const telemetry = config.telemetry;
  if (!telemetry || !store.telemetry) return fail(503,'TELEMETRY_DISABLED','Wi-Fi telemetry is unavailable');
  res.json(cloudSnapshot(await store.telemetry.recent(workspace(req),telemetry.deviceId,telemetry.test),telemetry));
 });
 const id=(req:Request)=>{const v=req.params.id;if(typeof v!=='string'||!/^[-a-zA-Z0-9]{1,160}$/.test(v))fail(400,'ID','Invalid database city identity');return v as string;};
 const revision=(req:Request)=>{const raw=req.headers['if-match'];if(!raw)fail(428,'REVISION','Read the city revision before changing it');if(typeof raw!=='string'||!/^"[1-9]\d{0,8}"$/.test(raw))fail(400,'REVISION','Invalid revision');return Number(String(raw).slice(1,-1));};
 const city=(input:unknown)=>{try{return parseCity(JSON.stringify(input));}catch{fail(422,'CITY','Invalid City JSON v1; validate references, limits and provenance in City Studio');}};
 const output=(res:Response,record:CityRecord)=>res.set('ETag',`"${record.revision}"`).json({data:record,meta:{}});
 const cursor=(req:Request,allowed:string[]=[])=>{if(Object.keys(req.query).some(k=>k!=='after'&&!allowed.includes(k)))fail(400,'QUERY','Unsupported list query');const after=req.query.after;if(after!==undefined&&(typeof after!=='string'||!/^[-a-zA-Z0-9]{1,160}$/.test(after)))fail(400,'QUERY','Invalid page cursor');return after as string|undefined;};
 const page=(res:Response,rows:{_id:string}[])=>res.json({data:rows.slice(0,50),meta:{limit:50,next:rows.length>50?rows[49]._id:null}});
 app.get('/api/cities',async(req,res)=>{
  const after=cursor(req,['deleted']);if(req.query.deleted!==undefined&&!['true','false'].includes(String(req.query.deleted)))fail(400,'QUERY','Only deleted=true/false is supported');
  page(res,await store.list(workspace(req),req.query.deleted==='true',after));
 });
 app.post('/api/cities',async(req,res)=>{
  const c=city(req.body?.city)!;const w=workspace(req),requestKey=req.body?.requestKey===undefined?null:key(req.body.requestKey);
  const databaseId=requestKey?hashToken(w+'\0citycopy\0'+requestKey):randomUUID();
  if(requestKey)await archive(req,'import','citycopy-'+requestKey,{databaseId,cityHash:hashToken(canonical(c))});
  const existing=await store.get(w,databaseId);if(existing){if(existing.deletedAt)fail(409,'ARCHIVED','This saved copy is archived. Restore it explicitly before updating.');res.status(200);output(res,existing);return;}
  const now=new Date().toISOString();const record:CityRecord={_id:databaseId,workspaceId:w,city:c,revision:1,createdAt:now,updatedAt:now,deletedAt:null};
  try{await store.create(record);}catch(e){if(!requestKey||!await store.get(w,databaseId))throw e;}
  res.status(201);output(res,(await store.get(w,databaseId))!);
 });
 app.get('/api/cities/:id',async(req,res)=>{const r=await store.get(workspace(req),id(req));if(!r)fail(404,'NOT_FOUND','City unavailable');output(res,r!);});
 const update=(mode:'save'|'delete'|'restore')=>async(req:Request,res:Response)=>{
  const rev=revision(req),key=id(req),w=workspace(req);const existing=await store.get(w,key);if(!existing)fail(404,'NOT_FOUND','City unavailable');
  const c=mode==='save'?city(req.body?.city)!:null;
  const r=await store.replace(w,key,rev,c,mode==='save'?null:mode==='delete');if(!r)fail(409,'CONFLICT','City changed or was deleted. Keep your draft; reload or save a separate copy.');output(res,r!);
 };
 app.put('/api/cities/:id',update('save'));app.delete('/api/cities/:id',update('delete'));app.post('/api/cities/:id/restore',update('restore'));
 const key=(value:unknown)=>{if(typeof value!=='string'||!/^[-a-zA-Z0-9]{8,120}$/.test(value))fail(400,'REQUEST_KEY','Provide an 8–120 character idempotency key');return value as string;};
 const archive=async(req:Request,kind:ArchiveRecord['kind'],requestKey:string,payload:Record<string,unknown>,input:unknown=payload)=>{
  const w=workspace(req),inputHash=hashToken(canonical(input));
  const record:ArchiveRecord={_id:hashToken(w+'\0'+kind+'\0'+requestKey),workspaceId:w,kind,requestKey,inputHash,createdAt:new Date().toISOString(),payload};
  const saved=await store.archive(record);if(saved.inputHash!==inputHash)fail(409,'IDEMPOTENCY','This request key already belongs to different inputs');return saved;
 };
 app.post('/api/imports/preview',(req,res)=>{
  const entries=req.body?.entries;if(!Array.isArray(entries)||entries.length>50)fail(400,'IMPORT','Preview up to 50 local entries');
  const data=(entries as unknown[]).map((entry,index)=>{try{const parsed=city(entry)!;return {index,valid:true,city:parsed,hash:hashToken(canonical(parsed))};}catch{return {index,valid:false,error:'Invalid City JSON v1; original browser entry retained'};}});
  res.json({data,meta:{originalsPreserved:true}});
 });
 app.post('/api/imports/commit',async(req,res)=>{
  const entries=req.body?.entries;if(!Array.isArray(entries)||entries.length>50)fail(400,'IMPORT','Commit up to 50 selected entries');
  // Validate the full selection before any write. Retry-safe identities survive partial outages.
  const validated=(entries as {city?:unknown;requestKey?:unknown}[]).map(e=>({city:city(e?.city)!,requestKey:key(e?.requestKey)}));
  const data=[];for(const entry of validated){
   const w=workspace(req),databaseId=hashToken(w+'\0import\0'+entry.requestKey),existing=await store.get(w,databaseId);
   if(existing?.deletedAt)fail(409,'ARCHIVED','This imported copy is archived. Restore it explicitly before retrying.');
   const receipt=await archive(req,'import',entry.requestKey,{databaseId,cityHash:hashToken(canonical(entry.city))});
   if(!existing){const now=new Date().toISOString();try{await store.create({_id:databaseId,workspaceId:w,city:entry.city,revision:1,createdAt:now,updatedAt:now,deletedAt:null});}catch(e){if(!await store.get(w,databaseId))throw e;}}
   const readback=await store.get(w,databaseId);if(!readback||readback.deletedAt||hashToken(canonical(readback.city))!==receipt.payload.cityHash)fail(409,'IMPORT_CHANGED','Imported database copy changed; originals are retained');data.push(readback);
  }res.json({data,meta:{readbackVerified:true,originalsPreserved:true}});
 });
 app.post('/api/scenarios',async(req,res)=>{
  const c=city(req.body?.city)!;const label=req.body?.label;if(typeof label!=='string'||!label.trim()||label.length>160)fail(422,'LABEL','Provide a snapshot label');
  const result=await archive(req,'scenario',key(req.body?.requestKey),{city:c,label,engineVersion:ENGINE_VERSION,cityHash:hashToken(canonical(c))});res.status(201).json({data:result,meta:{immutable:true}});
 });
 app.get('/api/scenarios',async(req,res)=>{const after=cursor(req);page(res,await store.archives(workspace(req),'scenario',after));});
 app.get('/api/scenarios/:id',async(req,res)=>{const r=await store.archived(workspace(req),id(req));if(r?.kind!=='scenario')fail(404,'NOT_FOUND','Snapshot unavailable');res.json({data:r,meta:{}});});
 const scenario=async(req:Request)=>{const sid=req.body?.scenarioId;if(typeof sid!=='string')fail(400,'SCENARIO','Select a saved snapshot');const s=await store.archived(workspace(req),sid);if(s?.kind!=='scenario')fail(404,'NOT_FOUND','Snapshot unavailable');if(s!.payload.engineVersion!==ENGINE_VERSION)fail(409,'ENGINE','Historical engine version is readable but cannot be replayed by this version');return s!;};
 app.post('/api/plans',async(req,res)=>{const s=await scenario(req);res.json({data:{scenarioId:s._id,engineVersion:ENGINE_VERSION,plan:planCollection(city(s.payload.city)!)},meta:{}});});
 app.post('/api/runs',async(req,res)=>{
  const s=await scenario(req),c=city(s.payload.city)!,plan=planCollection(c);
  if(!Number.isFinite(req.body?.time)||req.body.time<plan.duration||canonical(req.body?.plan)!==canonical(plan))fail(422,'RUN','Submit a completed run matching the saved snapshot plan');
  const end=advance(c,startSimulation(c,plan),plan.duration);
  if(!Array.isArray(req.body?.completed)||canonical([...req.body.completed].sort())!==canonical([...end.simulation.completed].sort()))fail(422,'RUN','Completed pickups do not match canonical replay');
  const result=await archive(req,'run',key(req.body?.requestKey),{scenarioId:s._id,engineVersion:ENGINE_VERSION,verification:'SERVER_REPLAY_SIMULATED',plan,completed:end.simulation.completed,events:end.simulation.events,finalCity:end.city,time:plan.duration},{scenarioId:s._id,plan,completed:end.simulation.completed});
  res.status(201).json({data:result,meta:{physicalCollection:false}});
 });
 app.get('/api/runs',async(req,res)=>{const after=cursor(req);page(res,await store.archives(workspace(req),'run',after));});
 app.get('/api/runs/:id',async(req,res)=>{const r=await store.archived(workspace(req),id(req));if(r?.kind!=='run')fail(404,'NOT_FOUND','Run unavailable');res.json({data:r,meta:{}});});
 app.use((_req,_res,next)=>next(new ApiError(404,'NOT_FOUND','API endpoint unavailable')));
 app.use((error:unknown,_req:Request,res:Response,_next:NextFunction)=>{
  const e=error as {status?:number;type?:string};const known=error instanceof ApiError;
  const status=known?error.status:e.type==='entity.too.large'?413:e.type==='entity.parse.failed'?400:503;
  res.status(status).json({error:{code:known?error.code:status===413?'SIZE':status===400?'JSON':'DATABASE_UNAVAILABLE',message:known?error.message:status===503?'Database unavailable; your local drafts are unchanged':'Invalid or oversized JSON request',requestId:randomUUID()}});
 });
 return app;
}
