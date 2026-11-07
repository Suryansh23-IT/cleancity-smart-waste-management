import {it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {MongoClient} from 'mongodb';
import {mongoStore} from './store';
import {createMunicipalApp} from './app';
import {passwordHash} from './auth';
import {captureSnapshot,showcaseCity,testReadings} from '../../src/core/showcase';
import {planCollection} from '../../src/core/routing';
import {startSimulation,advance} from '../../src/core/simulation';
import type {Server} from 'node:http';

// Opt-in only; no production URI fallback, no operator collection cleanup.
it.skipIf(!process.env.CLEANCITY_TEST_MONGODB_URI)('real MongoDB: CRUD, migration, sessions and immutable results survive API restart',async()=>{
 const uri=process.env.CLEANCITY_TEST_MONGODB_URI!;
 const database='cleancity_test_'+randomUUID().replaceAll('-','');
 const origin='http://127.0.0.1:5182',hash=await passwordHash('TEST-only-password-2026');
 let store=mongoStore(uri,database),server:Server|undefined,base='',cookie='',csrf='';
 async function listen(){await store.ready();server=createMunicipalApp(store,{origin,username:'operator',passwordHash:hash,workspaceId:'test-only',secureCookies:false}).listen(0,'127.0.0.1');await new Promise<void>(r=>server!.once('listening',r));base='http://127.0.0.1:'+(server!.address() as {port:number}).port;}
 async function stop(){if(server){await new Promise<void>(r=>server!.close(()=>r()));server=undefined;}await store.close();}
 async function api(path:string,method='GET',body?:unknown,revision?:number){const r=await fetch(base+'/api'+path,{method,headers:{Origin:origin,Cookie:cookie,'X-CSRF-Token':csrf,...(body?{'Content-Type':'application/json'}:{}),...(revision?{'If-Match':`"${revision}"`}:{})},body:body?JSON.stringify(body):undefined});expect(r.ok).toBe(true);if(path==='/session')cookie=r.headers.get('set-cookie')?.split(';')[0]??cookie;return(await r.json()).data;}
 try{
  await listen();csrf=(await api('/session','POST',{username:'operator',password:'TEST-only-password-2026'})).csrf;
  const c=captureSnapshot(showcaseCity(),testReadings(),'TEST'),created=await api('/cities','POST',{city:c});
  const imported=await api('/imports/commit','POST',{entries:[{city:c,requestKey:'atlas-import-123'}]});expect(imported[0].city).toEqual(c);
  const scenario=await api('/scenarios','POST',{city:c,label:'Atlas integration TEST',requestKey:'atlas-snapshot-123'}),plan=planCollection(c),end=advance(c,startSimulation(c,plan),plan.duration);
  const run=await api('/runs','POST',{scenarioId:scenario._id,plan,completed:end.simulation.completed,time:plan.duration,requestKey:'atlas-run-123'});
  await api('/cities/'+created._id,'PUT',{city:{...c,name:'After edit'}},1);
  await stop();store=mongoStore(uri,database);await listen();
  expect((await api('/cities/'+created._id)).revision).toBe(2);
  expect((await api('/scenarios/'+scenario._id)).payload.city).toEqual(c);
  expect((await api('/runs/'+run._id)).payload.completed).toHaveLength(4);
  expect((await api('/imports/commit','POST',{entries:[{city:c,requestKey:'atlas-import-123'}]}))[0]._id).toBe(imported[0]._id);
 }finally{
  await stop();
  // Only this freshly generated test namespace is eligible for cleanup.
  if(!/^cleancity_test_[a-f0-9]{32}$/.test(database))throw Error('Refusing unsafe test cleanup');
  const cleanup=new MongoClient(uri,{serverSelectionTimeoutMS:5000});try{await cleanup.connect();await cleanup.db(database).dropDatabase();}finally{await cleanup.close();}
 }
},60000);
