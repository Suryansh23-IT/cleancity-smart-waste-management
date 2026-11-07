import type {IncomingMessage,ServerResponse} from 'node:http';
import {createMunicipalApp} from './app';
import {mongoStore} from './store';

// Lazy initialization keeps missing/invalid production configuration fail-closed.
// No listener, serial port, SQLite or test repository is loaded by this adapter.
export function hostedHandler(env:NodeJS.ProcessEnv){
 let app:ReturnType<typeof createMunicipalApp>|undefined;
 return (req:IncomingMessage,res:ServerResponse)=>{
  try{
   if(!app){
    const origin=env.APP_ORIGIN??'';
    app=createMunicipalApp(mongoStore(env.MONGODB_URI??'',env.MONGODB_DATABASE??''),{origin,username:env.OPERATOR_USERNAME??'',passwordHash:env.OPERATOR_PASSWORD_HASH??'',workspaceId:env.WORKSPACE_ID??'',secureCookies:true});
   }
   app(req,res);
  }catch{res.writeHead(503,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({error:{code:'CONFIGURATION',message:'Municipal API is not configured for production'}}));}
 };
}
