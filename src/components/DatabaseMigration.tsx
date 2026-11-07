import {useState} from 'react';
import type {City} from '../core/model';
import {storageKey} from '../core/storage';
export type DatabaseRequest=(path:string,method?:string,body?:unknown,revision?:number,withMeta?:boolean)=>Promise<any>;
export async function stableRequestKey(input:unknown){const bytes=new TextEncoder().encode(JSON.stringify(input));const hash=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');}
export function downloadJson(name:string,value:string){const url=URL.createObjectURL(new Blob([value],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
interface Preview {index:number;valid:boolean;city?:City;hash?:string;error?:string}
export default function DatabaseMigration({request,perform,onImported}:{request:DatabaseRequest;perform:(action:()=>Promise<void>)=>Promise<void>;onImported:()=>Promise<void>}){
 const [preview,setPreview]=useState<Preview[]>([]),[selected,setSelected]=useState<number[]>([]),[backup,setBackup]=useState(false),[message,setMessage]=useState('Migration copies selected cities; browser originals are never removed.');
 return <section aria-label="Browser city migration"><h3>Copy existing browser cities to the database</h3><p role="status">{message}</p>
 <button onClick={()=>{downloadJson('cleancity-browser-backup.json',localStorage.getItem(storageKey)??'[]');setBackup(true);}}>Download raw browser backup</button>
 <button onClick={()=>void perform(async()=>{const raw=localStorage.getItem(storageKey)??'[]';let entries:unknown;try{entries=JSON.parse(raw);}catch{throw Error('Browser library is corrupt JSON. Download the raw backup; nothing was overwritten.');}const p=await request('/imports/preview','POST',{entries});setPreview(p);setSelected([]);setMessage('Preview ready. Select valid entries to copy; invalid entries stay untouched.');})}>Preview browser migration</button>
 <ul>{preview.map(p=><li key={p.index}>{p.valid?<label><input type="checkbox" checked={selected.includes(p.index)} onChange={e=>setSelected(values=>e.target.checked?[...values,p.index]:values.filter(i=>i!==p.index))}/>{p.city?.name}</label>:<>Entry {p.index+1}: {p.error}</>}</li>)}</ul>
 <button disabled={!backup||!selected.length} onClick={()=>void perform(async()=>{const entries=preview.filter(p=>selected.includes(p.index)&&p.valid).map(p=>({city:p.city,requestKey:'migration-'+p.hash}));const saved=await request('/imports/commit','POST',{entries});if(saved.length!==entries.length)throw Error('Incomplete import acknowledgment; originals retained');setMessage(saved.length+' city copies imported and read back. Browser originals retained. Safe to retry the same selection.');await onImported();})}>Import selected browser cities</button>
 {!backup&&<p>Download a raw backup before importing. A download request does not verify your backup file; retain it yourself.</p>}
 </section>;
}
