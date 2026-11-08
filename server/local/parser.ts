export const pins = [[5,18],[26,27],[19,21],[32,33]] as const;
export type Observation={id:string;status:'VALID'|'NO_ECHO'|'INVALID';distanceCm:number|null;pulseUs:number;reason:string|null};
export function parseLine(line:string):Observation|null{
 if(line.length>512)return null;
 const m=/^Sensor ([1-4])\s*\|\s*TRIG:(\d+) ECHO:(\d+)\s*\|\s*Before:(LOW|HIGH)\s*\|\s*Pulse:(\d+)us\s*\|\s*After:(LOW|HIGH)\s*\|\s*(?:Distance:(\d+(?:\.\d+)?) cm|(NO ECHO))\s*$/.exec(line.trim());
 if(!m)return null;const index=Number(m[1])-1;if(Number(m[2])!==pins[index][0]||Number(m[3])!==pins[index][1])return null;
 const pulse=Number(m[5]),distance=m[7]?Number(m[7]):null;
 if(!Number.isSafeInteger(pulse)||pulse>30000)return null;
 return diagnosticObservation(index, pulse, distance, m[4]==='HIGH', m[6]==='HIGH');
}
export function diagnosticObservation(index:number,pulse:number,distance:number|null,beforeHigh:boolean,afterHigh:boolean):Observation {
 const base={id:`BIN-00${index+1}`,pulseUs:pulse};
 if(distance===null&&pulse===0)return {...base,status:'NO_ECHO',distanceCm:null,reason:'No echo pulse'};
 if(pulse>0&&distance!==null&&distance>=2&&distance<=400&&Math.abs(distance-pulse*.0343/2)<.03&&!beforeHigh&&!afterHigh)return {...base,status:'VALID',distanceCm:distance,reason:null};
 return {...base,status:'INVALID',distanceCm:null,reason:'Inconsistent pulse, distance, or Echo state'};
}
export class DiagnosticLines{
 private buffer='';private dropping=false;
 push(chunk:Buffer|string):Observation[]{const out=new Map<string,Observation>();for(const char of chunk.toString()){if(char==='\n'){if(!this.dropping){const o=parseLine(this.buffer);if(o)out.set(o.id,o);}this.reset();}else if(!this.dropping){if(this.buffer.length>=512){this.buffer='';this.dropping=true;}else this.buffer+=char;}}return [...out.values()];}
 reset(){this.buffer='';this.dropping=false;}
}
