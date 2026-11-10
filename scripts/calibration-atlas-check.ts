import {randomUUID} from 'node:crypto';
import {MongoClient} from 'mongodb';
import {mongoStore} from '../server/municipal/store';
import {createMunicipalApp} from '../server/municipal/app';
import {hashToken,passwordHash} from '../server/municipal/auth';
import {buildBatch,telemetryConfig} from '../server/municipal/cloudTelemetry';
import {physicalChannels} from '../src/core/physical';

// Test-only workspace and device share the existing development DB, never the real device.
const suffix=randomUUID(), workspaceId='acceptance-'+suffix, deviceId='device-test-'+suffix;
const uri=process.env.MONGODB_URI!, database=process.env.MONGODB_DATABASE!;
if(database!=='cleancity_development')throw Error('Refusing non-development database');
const token='test-only-'+randomUUID()+randomUUID(), password='test-only-'+randomUUID();
const telemetry=telemetryConfig({CLOUD_DEVICE_ID:deviceId,CLOUD_DEVICE_TOKEN_HASH:hashToken(token)})!;
const origin='http://127.0.0.1:5182';let store=mongoStore(uri,database);
let server=createMunicipalApp(store,{origin,username:'acceptance',passwordHash:await passwordHash(password),workspaceId,secureCookies:false,telemetry}).listen(0,'127.0.0.1');
await new Promise<void>(r=>server.once('listening',r));
const base='http://127.0.0.1:'+(server.address() as {port:number}).port+'/api';
try{
 const now=Date.now();await store.telemetry!.save(buildBatch({deviceId,bootId:'a'.repeat(32),seq:1,sampledAtMs:now,readings:physicalChannels.map(binId=>({binId,pulseUs:700,beforeHigh:false,afterHigh:false}))},workspaceId,telemetry,now));
 const login=await fetch(base+'/session',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({username:'acceptance',password})});if(!login.ok)throw Error('Test login failed');
 const cookie=login.headers.get('set-cookie')!.split(';')[0],csrf=(await login.json()).data.csrf;
 for(const [i,id] of physicalChannels.entries()){const emptyDistanceCm=23-i*.5, usableDepthCm=emptyDistanceCm-2;const res=await fetch(base+'/telemetry/calibration/'+id,{method:'PUT',headers:{Origin:origin,Cookie:cookie,'X-CSRF-Token':csrf,'Content-Type':'application/json'},body:JSON.stringify({emptyDistanceCm,usableDepthCm})});if(!res.ok)throw Error(`Calibration ${id}: ${res.status}`);}
 for(let n=0;n<2;n++){const response=await fetch(base+'/telemetry/snapshot',{headers:{Cookie:cookie}});if(!response.ok)throw Error('Snapshot failed');const snap=await response.json();for(const [i,bin] of snap.bins.entries()){const empty=23-i*.5,expected=(empty-bin.distanceCm)/(empty-2)*100;if(bin.calibration.emptyDistanceCm!==empty||Math.abs(bin.fillPercent-expected)>.001)throw Error('Incorrect calibration or fill');}}
 await new Promise<void>(r=>server.close(()=>r()));await store.close();store=mongoStore(uri,database);
 const saved=await store.telemetry!.getCalibrations!(workspaceId,deviceId);if(Object.keys(saved).length!==4)throw Error('Reload lost calibration');
 const second=mongoStore(uri,database);
 try{for(let i=0;i<7;i++)if(!await (i%2?store:second).loginAttempt!(workspaceId,now))throw Error('Rate limit applied too early');if(await second.loginAttempt!(workspaceId,now))throw Error('Shared rate limit did not block');}finally{await second.close();}
 console.log('PASS: isolated Atlas TEST device: four independent calibrations, API refresh and database reopen');
 console.log('PASS: login throttling shared across two independent Atlas store instances');
}finally{
 if(server.listening)await new Promise<void>(r=>server.close(()=>r()));await store.close();
 const c=new MongoClient(uri,{serverSelectionTimeoutMS:5000});try{await c.connect();const db=c.db(database);for(const name of ['iot_observations','iot_calibrations','sessions'])await db.collection(name).deleteMany({workspaceId});await db.collection('login_rate_limits').deleteMany({_id:{$regex:`^${workspaceId}:`}});}finally{await c.close();}
}
