import type {LocalPhysical} from './service.ts';
export interface PortLike {isOpen:boolean;open:(cb:(error:Error|null)=>void)=>void;close:()=>unknown;on:(event:string,listener:(value:any)=>void)=>unknown}
export class SerialReceiver{
 private timer:ReturnType<typeof setTimeout>|undefined;private stopped=false;private current:PortLike|undefined;
 private service:LocalPhysical;private path:string;private factory:(path:string)=>PortLike;
 constructor(service:LocalPhysical,path:string,factory:(path:string)=>PortLike){if(!/^COM\d+$/i.test(path))throw Error('An explicit COM port is required');this.service=service;this.path=path;this.factory=factory;}
 start(){if(this.stopped||this.current)return;const port=this.factory(this.path);this.current=port;this.service.port=this.path;
 const recover=(message:string)=>{if(this.current!==port||this.stopped)return;this.service.disconnected(message);this.current=undefined;if(port.isOpen)port.close();if(!this.timer)this.timer=setTimeout(()=>{this.timer=undefined;this.start();},3000);};
 port.on('data',(data:Buffer)=>{if(this.current===port)this.service.receive(data);});port.on('error',(e:Error)=>recover(e.message));port.on('close',()=>recover('Serial port disconnected'));
 port.open(error=>{if(this.current!==port||this.stopped){if(port.isOpen)port.close();return;}if(error)recover(error.message);else{this.service.parser.reset();this.service.connected=true;this.service.error=null;}});
 }
 stop(){this.stopped=true;if(this.timer)clearTimeout(this.timer);const port=this.current;this.current=undefined;if(port?.isOpen)port.close();this.service.disconnected('Receiver stopped');}
}
