import type {SerialControls} from './http.ts';
export class SerialManager implements SerialControls {
 private active:{stop:()=>Promise<void>}|null=null;private busy=false;
 private enumerate:()=>Promise<{path:string;label:string}[]>; private create:(path:string)=>{stop:()=>Promise<void>};
 constructor(enumerate:()=>Promise<{path:string;label:string}[]>,create:(path:string)=>{stop:()=>Promise<void>}){this.enumerate=enumerate;this.create=create;}
 list=()=>this.enumerate();
 connect=async(path:string)=>{if(this.busy||this.active)throw Error('Disconnect the selected receiver before reconnecting or changing ports');this.busy=true;try{const found=(await this.list()).find(p=>p.path.toUpperCase()===path.toUpperCase());if(!found)throw Error('Port no longer detected; detect again');this.active=this.create(found.path);}finally{this.busy=false;}};
 disconnect=async()=>{if(this.busy)throw Error('Serial operation in progress; try again');this.busy=true;try{await this.active?.stop();this.active=null;}finally{this.busy=false;}};
}
