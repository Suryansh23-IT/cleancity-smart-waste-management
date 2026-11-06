import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {fillFromDistance} from '../telemetry.ts';
import type {Observation} from './parser.ts';
export const ids=['BIN-001','BIN-002','BIN-003','BIN-004'];
export type Calibration={emptyDistanceCm:number;usableDepthCm:number};
type Row=Observation&{receivedAt:string;fillPercent:number|null;sessionId:string};
export class PhysicalStore{
 db:DatabaseSync;limit:number;
 constructor(path:string,limit=10000){if(path!==':memory:')mkdirSync(dirname(path),{recursive:true});this.db=new DatabaseSync(path);this.limit=limit;this.db.exec(`PRAGMA journal_mode=WAL;PRAGMA busy_timeout=1000;
 CREATE TABLE IF NOT EXISTS observations(seq INTEGER PRIMARY KEY,channel TEXT NOT NULL,received INTEGER NOT NULL,record TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS channel_seq ON observations(channel,seq DESC);
 CREATE TABLE IF NOT EXISTS channels(id TEXT PRIMARY KEY,latest TEXT,last_valid TEXT,calibration TEXT);
 `);for(const id of ids)this.db.prepare('INSERT OR IGNORE INTO channels(id) VALUES(?)').run(id);}
 calibration(id:string):Calibration|null{this.check(id);const r=this.db.prepare('SELECT calibration FROM channels WHERE id=?').get(id)!;return r.calibration?JSON.parse(String(r.calibration)):null;}
 check(id:string){if(!ids.includes(id))throw Error('Unknown sensor channel');}
 calibrate(id:string,input:unknown){this.check(id);const c=input as Calibration;if(!c||!Number.isFinite(c.emptyDistanceCm)||!Number.isFinite(c.usableDepthCm)||c.usableDepthCm<=0)throw Error('Enter measured empty distance and positive usable depth');fillFromDistance(2,c.emptyDistanceCm,c.emptyDistanceCm-c.usableDepthCm);this.db.prepare('UPDATE channels SET calibration=? WHERE id=?').run(JSON.stringify({emptyDistanceCm:c.emptyDistanceCm,usableDepthCm:c.usableDepthCm}),id);}
 save(o:Observation,receivedAt:string,sessionId:string){this.check(o.id);const c=this.calibration(o.id);const row:Row={...o,receivedAt,sessionId,fillPercent:c&&o.status==='VALID'?fillFromDistance(o.distanceCm,c.emptyDistanceCm,c.emptyDistanceCm-c.usableDepthCm):null};const json=JSON.stringify(row);this.db.exec('BEGIN IMMEDIATE');try{
 this.db.prepare('INSERT INTO observations(channel,received,record) VALUES(?,?,?)').run(o.id,Date.parse(receivedAt),json);
 this.db.prepare('UPDATE channels SET latest=?,last_valid=CASE WHEN ? THEN ? ELSE last_valid END WHERE id=?').run(json,o.status==='VALID'?1:0,json,o.id);
 this.db.prepare('DELETE FROM observations WHERE channel=? AND (received<? OR seq NOT IN (SELECT seq FROM observations WHERE channel=? ORDER BY seq DESC LIMIT ?))').run(o.id,Date.parse(receivedAt)-86400000,o.id,this.limit);this.db.exec('COMMIT');
 }catch(e){this.db.exec('ROLLBACK');throw e;}}
 history(id:string,limit=30){this.check(id);return this.db.prepare('SELECT record FROM observations WHERE channel=? ORDER BY seq DESC LIMIT ?').all(id,Math.min(100,Math.max(1,limit))).map(r=>JSON.parse(String(r.record)) as Row).reverse();}
 snapshot(){return ids.map((id,index)=>{const r=this.db.prepare('SELECT latest,last_valid FROM channels WHERE id=?').get(id)!;const latest:Row|null=r.latest?JSON.parse(String(r.latest)):null;return {id,label:`Sensor ${index+1} · ${id}`,deviceId:'device-local-esp32',distanceCm:latest?.distanceCm??null,fillPercent:latest?.fillPercent??null,receivedAt:latest?.receivedAt??null,status:latest?.status??'UNKNOWN',reason:latest?.reason??null,lastValid:r.last_valid?JSON.parse(String(r.last_valid)):null,calibration:this.calibration(id),history:this.history(id)};});}
 close(){this.db.close();}
}
