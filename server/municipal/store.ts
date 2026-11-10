import {MongoClient, type Collection} from 'mongodb';
import type {City} from '../../src/core/model';
import type {TelemetryBatch, TelemetryStore} from './cloudTelemetry';

export interface CityRecord {_id:string;workspaceId:string;city:City;revision:number;createdAt:string;updatedAt:string;deletedAt:string|null}
export interface SessionRecord {_id:string;workspaceId:string;csrf:string;expiresAt:Date}
export interface ArchiveRecord {_id:string;workspaceId:string;kind:'scenario'|'run'|'import';requestKey:string;inputHash:string;createdAt:string;payload:Record<string,unknown>}
export interface MunicipalStore {
 telemetry?: TelemetryStore;
 ready():Promise<void>;
 loginAttempt?(workspace:string,now:number,client?:string):Promise<boolean>;
 session(tokenHash:string):Promise<SessionRecord|null>;
 createSession(session:SessionRecord):Promise<void>;
 deleteSession(tokenHash:string):Promise<void>;
 list(workspace:string,deleted:boolean,after?:string):Promise<CityRecord[]>;
 get(workspace:string,id:string):Promise<CityRecord|null>;
 create(record:CityRecord):Promise<void>;
 replace(workspace:string,id:string,revision:number,city:City|null,deleted:boolean|null):Promise<CityRecord|null>;
 archive(record:ArchiveRecord):Promise<ArchiveRecord>;
 archives(workspace:string,kind:ArchiveRecord['kind'],after?:string):Promise<ArchiveRecord[]>;
 archived(workspace:string,id:string):Promise<ArchiveRecord|null>;
 close():Promise<void>;
}

// No memory fallback: unavailable MongoDB must never advertise a database save.
export function mongoStore(uri:string,database:string):MunicipalStore {
 if(!/^mongodb(?:\+srv)?:\/\//.test(uri)||!/^cleancity_[a-zA-Z0-9_-]+$/.test(database))throw Error('Configure a dedicated cleancity_ database and MongoDB URI');
 let opening:Promise<MongoClient>|undefined;
 const client=()=>opening??=(async()=>{
  const c=new MongoClient(uri,{maxPoolSize:10,minPoolSize:0,serverSelectionTimeoutMS:5000,waitQueueTimeoutMS:5000,connectTimeoutMS:5000});
  try{await c.connect();const db=c.db(database);await db.collection('sessions').createIndex({expiresAt:1},{expireAfterSeconds:0});await db.collection('cities').createIndex({workspaceId:1,deletedAt:1,_id:1});await db.collection('archives').createIndex({workspaceId:1,kind:1,_id:1});return c;}
  catch{await c.close();opening=undefined;throw Error('Database unavailable');}
 })();
 const cities=async()=>(await client()).db(database).collection<CityRecord>('cities');
 const sessions=async()=>(await client()).db(database).collection<SessionRecord>('sessions');
 let limiterOpening:Promise<Collection<{_id:string;count:number;expiresAt:Date}>>|undefined;
 const loginLimits=()=>limiterOpening??=(async()=>{const c=(await client()).db(database).collection<{_id:string;count:number;expiresAt:Date}>('login_rate_limits');await c.createIndex({expiresAt:1},{expireAfterSeconds:0});return c;})().catch(error=>{limiterOpening=undefined;throw error;});
 let calibrationOpening: Promise<Collection<{workspaceId:string;deviceId:string;binId:string;calibration:import('./cloudTelemetry').Calibration}>> | undefined;
 const calibrations = () => calibrationOpening ??= (async () => {
  const collection=(await client()).db(database).collection<{workspaceId:string;deviceId:string;binId:string;calibration:import('./cloudTelemetry').Calibration}>('iot_calibrations');
  await collection.createIndex({workspaceId:1,deviceId:1,binId:1},{unique:true});
  return collection;
 })().catch(error=>{calibrationOpening=undefined;throw error;});
 let telemetryOpening: Promise<Collection<TelemetryBatch>> | undefined;
 const telemetry = () => telemetryOpening ??= (async () => {
  const readings = (await client()).db(database).collection<TelemetryBatch>('iot_observations');
  await readings.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await readings.createIndex({ workspaceId: 1, deviceId: 1, test: 1, slot: 1 }, { unique: true });
  await readings.createIndex({ workspaceId: 1, deviceId: 1, test: 1, sampledAt: -1, receivedAt: -1 });
  return readings;
 })().catch(error => { telemetryOpening = undefined; throw error; });
 return {
  async loginAttempt(workspace,now,client='fixture'){
   const windowMs=15*60*1000, bucket=Math.floor(now/windowMs), id=`${workspace}:${client}:${bucket}`;
   const collection=await loginLimits();
   const row=await collection.findOneAndUpdate({_id:id},{$inc:{count:1},$setOnInsert:{expiresAt:new Date((bucket+2)*windowMs)}},{upsert:true,returnDocument:'after'});
   return !!row && row.count<=8;
  },
  telemetry: {
   async getCalibrations(workspaceId, deviceId) {
    const rows = await (await calibrations()).find({workspaceId,deviceId}).toArray();
    return Object.fromEntries(rows.map(row => [row.binId,row.calibration]));
   },
   async setCalibration(workspaceId, deviceId, binId, calibration) {
    await (await calibrations()).updateOne({workspaceId,deviceId,binId},{$set:{calibration}},{upsert:true});
   },
   async save(batch) {
    const readings = await telemetry();
    try { await readings.insertOne(batch); return 'stored'; }
    catch (error) {
     if ((error as { code?: number }).code !== 11000) throw error;
     const existing = await readings.findOne({ _id: batch._id });
     return existing ? existing.payloadHash === batch.payloadHash ? 'duplicate' : 'conflict' : 'limited';
    }
   },
   async recent(workspaceId, deviceId, test) {
    return (await telemetry()).find({ workspaceId, deviceId, test, expiresAt: { $gt: new Date() } })
      .sort({ sampledAt: -1, receivedAt: -1 }).limit(30).toArray();
   },
  },
  async ready(){await(await client()).db(database).command({ping:1});},
  async session(_id){return(await sessions()).findOne({_id,expiresAt:{$gt:new Date()}});},
  async createSession(s){await(await sessions()).insertOne(s);},
  async deleteSession(_id){await(await sessions()).deleteOne({_id});},
  async list(workspaceId,deleted,after){return(await cities()).find({workspaceId,deletedAt:deleted?{$ne:null}:null,...(after?{_id:{$gt:after}}:{})}).sort({_id:1}).limit(51).toArray();},
  async get(workspaceId,_id){return(await cities()).findOne({_id,workspaceId});},
  async create(record){await(await cities()).insertOne(record);},
  async replace(workspaceId,_id,revision,city,deleted){return(await cities()).findOneAndUpdate({_id,workspaceId,revision,...(deleted===false?{deletedAt:{$ne:null}}:{deletedAt:null})},{$set:{...(city?{city}:{}),...(deleted===null?{}:{deletedAt:deleted?new Date().toISOString():null}),updatedAt:new Date().toISOString()},$inc:{revision:1}},{returnDocument:'after'});},
  async archive(record){const col=(await client()).db(database).collection<ArchiveRecord>('archives');try{await col.insertOne(record);return record;}catch(e){if((e as {code?:number}).code!==11000)throw e;const existing=await col.findOne({_id:record._id,workspaceId:record.workspaceId});if(!existing)throw e;return existing;}},
  async archives(workspaceId,kind,after){return(await client()).db(database).collection<ArchiveRecord>('archives').find({workspaceId,kind,...(after?{_id:{$gt:after}}:{})}).sort({_id:1}).limit(51).toArray();},
  async archived(workspaceId,_id){return(await client()).db(database).collection<ArchiveRecord>('archives').findOne({_id,workspaceId});},
  async close(){if(opening)await(await opening).close();}
 };
}
