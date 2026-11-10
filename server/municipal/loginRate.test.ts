import {it,expect} from 'vitest';
import {createMunicipalApp} from './app';
import {passwordHash} from './auth';
import {TestStore} from './testStore';

it('shares the login limit across API instances and fails closed on storage errors',async()=>{
 const store=new TestStore(), counts=new Map<string,number>();
 const shared=Object.assign(store,{async loginAttempt(workspace:string,_now:number,client?:string){await store.ready();const key=workspace+client;const n=(counts.get(key)??0)+1;counts.set(key,n);return n<=8;}});
 const config={origin:'https://preview.example',username:'operator',passwordHash:await passwordHash('test-password-long-enough'),workspaceId:'test-workspace',secureCookies:true};
 const servers=[createMunicipalApp(shared,config).listen(0,'127.0.0.1'),createMunicipalApp(shared,config).listen(0,'127.0.0.1')];
 await Promise.all(servers.map(s=>new Promise<void>(r=>s.once('listening',r))));
 try{
  const attempt=(i:number,ip='192.0.2.1')=>fetch(`http://127.0.0.1:${(servers[i].address() as {port:number}).port}/api/session`,{method:'POST',headers:{Origin:config.origin,'Content-Type':'application/json','X-Forwarded-For':ip},body:JSON.stringify({username:'operator',password:'incorrect'})});
  for(let i=0;i<8;i++)expect((await attempt(i%2)).status).toBe(401);
  expect((await attempt(0)).status).toBe(429);
  expect((await attempt(0,'192.0.2.2')).status).toBe(401);
  store.available=false;expect((await attempt(1)).status).toBe(503);
 }finally{await Promise.all(servers.map(s=>new Promise<void>(r=>s.close(()=>r()))));}
});
