// Explicit TEST double. Never imported by the production listener or used as a fallback.
import type {MunicipalStore,CityRecord,SessionRecord,ArchiveRecord} from './store';
export class TestStore implements MunicipalStore {
 cities=new Map<string,CityRecord>();sessions=new Map<string,SessionRecord>();history=new Map<string,ArchiveRecord>();available=true;
 async ready(){if(!this.available)throw Error('TEST database unavailable');}
 async session(id:string){await this.ready();return structuredClone(this.sessions.get(id)??null);}
 async createSession(s:SessionRecord){await this.ready();this.sessions.set(s._id,structuredClone(s));}
 async deleteSession(id:string){await this.ready();this.sessions.delete(id);}
 async list(w:string,deleted:boolean,after=''){await this.ready();return structuredClone([...this.cities.values()].filter(r=>r.workspaceId===w&&!!r.deletedAt===deleted&&r._id>after).sort((a,b)=>a._id<b._id?-1:1).slice(0,51));}
 async get(w:string,id:string){await this.ready();const r=this.cities.get(id);return r?.workspaceId===w?structuredClone(r):null;}
 async create(r:CityRecord){await this.ready();if(this.cities.has(r._id))throw Error('duplicate TEST city');this.cities.set(r._id,structuredClone(r));}
 async replace(w:string,id:string,revision:number,city:CityRecord['city']|null,deleted:boolean|null){await this.ready();const r=this.cities.get(id);if(!r||r.workspaceId!==w||r.revision!==revision||(deleted===false?!r.deletedAt:!!r.deletedAt))return null;const next={...r,city:city??r.city,revision:r.revision+1,updatedAt:new Date().toISOString(),deletedAt:deleted===null?r.deletedAt:deleted?new Date().toISOString():null};this.cities.set(id,structuredClone(next));return structuredClone(next);}
 async archive(r:ArchiveRecord){await this.ready();const existing=this.history.get(r._id);if(existing)return structuredClone(existing);this.history.set(r._id,structuredClone(r));return structuredClone(r);}
 async archives(w:string,kind:ArchiveRecord['kind'],after=''){await this.ready();return structuredClone([...this.history.values()].filter(r=>r.workspaceId===w&&r.kind===kind&&r._id>after).sort((a,b)=>a._id<b._id?-1:1).slice(0,51));}
 async archived(w:string,id:string){await this.ready();const r=this.history.get(id);return r?.workspaceId===w?structuredClone(r):null;}
 async close(){}
}
