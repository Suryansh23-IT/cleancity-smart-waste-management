import {useState} from 'react';
import {City} from '../core/model';
import {randomize} from '../core/presets';
export default function DemandSeed({city,locked,onApply}:{city:City;locked:boolean;onApply:(c:City)=>boolean}){
 const [seed,setSeed]=useState(String(city.settings.seed));
 const [message,setMessage]=useState('');
 function apply(value:number){
  if(!Number.isInteger(value)||value<0||value>2147483647){setMessage('Use a whole number from 0 to 2147483647.');return;}
  if(onApply(randomize({...city,settings:{...city.settings,seed:value}}))){setSeed(String(value));setMessage(`Applied seed ${value}. Bin fills updated; prepare a new collection plan.`);}
 }
 return <section className="panel demand-seed" aria-label="Demo demand seed"><b>Demo demand · seed {city.settings.seed}</b><p>Change bin fill levels without rebuilding roads, zones or truck assignments. Same seed repeats the same demand.</p><form onSubmit={e=>{e.preventDefault();apply(Number(seed));}}><fieldset disabled={locked}><label>Demand seed<input aria-label="Demand seed" type="number" min="0" max="2147483647" step="1" required value={seed} onChange={e=>setSeed(e.target.value)}/></label><button type="submit">Apply seed & fills</button><button type="button" className="primary" onClick={()=>apply(city.settings.seed>=2147483647?0:city.settings.seed+1)}>Next seed · new demand</button></fieldset></form><p role="status">{locked?'Reset the current collection run before changing demand.':message||'Tip: Next seed changes demand in one click. Then Plan collection.'}</p></section>;
}
