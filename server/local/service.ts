import {randomUUID} from 'node:crypto';
import {DiagnosticLines} from './parser.ts';
import type {Observation} from './parser.ts';
import {PhysicalStore} from './store.ts';
export class LocalPhysical{
 store:PhysicalStore;parser=new DiagnosticLines();sessionId=randomUUID();connected=false;port:string|null=null;error:string|null=null;storageError:string|null=null;
 pending=new Map<string,{o:Observation;at:string}>();lastReceivedAt:string|null=null;
 constructor(store:PhysicalStore){this.store=store;}
 receive(data:Buffer|string){for(const o of this.parser.push(data)){const at=new Date().toISOString();this.pending.set(o.id,{o,at});this.lastReceivedAt=at;}}
 flush(){try{for(const [id,{o,at}]of this.pending){this.store.save(o,at,this.sessionId);this.pending.delete(id);}this.storageError=null;}catch(e){this.storageError=e instanceof Error?e.message:String(e);}}
 disconnected(message:string|null){this.connected=false;this.error=message;this.parser.reset();}
 snapshot(){if(this.storageError)throw Error('Local database unavailable');return {source:'PHYSICAL',origin:'LOCAL_USB',staleAfterMs:10000,receiver:{connected:this.connected,port:this.port,error:this.error,lastReceivedAt:this.lastReceivedAt,sessionId:this.sessionId},bins:this.store.snapshot()};}
}
