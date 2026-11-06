import { useState } from "react";
import { City, uid } from "../core/model";
import { Selection } from "./CityCanvas";

type Kind = "bin" | "road" | "node";
export default function StudioCreate({ city, change, select, locked }: {
  city: City; change: (next: City, graph?: boolean) => boolean;
  select: (selection: Selection) => void; locked: boolean;
}) {
  const [kind, setKind] = useState<Kind | null>(null);
  const [error, setError] = useState("");
  const places = city.nodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>);
  function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    if (!name) { setError("Give this item a name so you can find it later."); return; }
    const id = uid(kind ?? "item");
    let next: City;
    if (kind === "node") {
      // Separate successive additions so a new network is visible before dragging.
      const x=city.width*(.25+(city.nodes.length%4)*.15);
      const y=city.height*(.3+(Math.floor(city.nodes.length/4)%3)*.18);
      next = {...city, nodes: [...city.nodes, {id, label:name, type:"INTERSECTION", x, y}]};
    } else if (kind === "bin") {
      if (!city.nodes.length) { setError("Add a junction first. Each bin needs a road access point."); return; }
      next = {...city, bins: [...city.bins, {id, name, roadNodeId:String(data.get("place")), fillPercent:Number(data.get("fill")), capacityBinUnits:Number(data.get("capacity")), source:"SIMULATED", history:[]}]};
    } else {
      const from = String(data.get("from")), to = String(data.get("to"));
      const distanceKm = Number(data.get("distance"));
      if (from === to || !city.nodes.some(n=>n.id===from) || !city.nodes.some(n=>n.id===to)) {
        setError("Choose two different junctions to connect."); return;
      }
      if (!(distanceKm > 0) || !Number.isFinite(distanceKm)) { setError("Enter a road length greater than zero."); return; }
      const roads = [{id, name, fromNodeId:from, toNodeId:to, distanceKm}];
      if (data.get("direction") === "two") roads.push({id:uid("road"), name, fromNodeId:to, toNodeId:from, distanceKm});
      next = {...city, roads:[...city.roads,...roads]};
    }
    if (kind && change(next, kind !== "bin")) { select({kind,id}); setKind(null); }
    else setError("This item could not be added. Check the workspace message for details; your city is unchanged.");
  }
  return <section className="studio-create" aria-label="Add to city">
    <div className="studio-create-toolbar"><div><b>Add to city</b><small>Choose an item. Select it on the map to edit later.</small></div>
      {(["bin","road","node"] as const).map(k=><button key={k} disabled={locked} aria-expanded={kind===k} onClick={()=>{setKind(kind===k?null:k);setError("");}}>+ {k==='node'?'Junction':k==='road'?'Road':'Bin'}</button>)}
      {locked&&<small>Reset the simulation before editing.</small>}
    </div>
    {kind&&<form key={`${kind}-${city.id}`} onSubmit={create} className="studio-create-form" aria-label={`Create ${kind}`}>
      <div className="section-heading"><h3>{kind==='node'?'Add a road junction':kind==='road'?'Connect two places':'Add a collection bin'}</h3><button type="button" onClick={()=>setKind(null)}>Cancel</button></div>
      <label>Name<input name="name" required maxLength={160} placeholder={kind==='road'?'e.g. Market Street':kind==='bin'?'e.g. Library entrance':'e.g. Station junction'} autoFocus/></label>
      {kind==='node'&&<p>The junction is placed on the map with space around it. Drag it to the right place, then connect it with a road.</p>}
      {kind==='bin'&&<><label>Road access point<select name="place" required>{places}</select></label><div className="field-row"><label>Current fill (%)<input name="fill" type="number" min={0} max={100} defaultValue={0} required/></label><label>Capacity (bin units)<input name="capacity" type="number" min={.01} step="any" defaultValue={1} required/></label></div><p>The truck reaches this bin through its road access point. You can drag the marker without changing that access.</p></>}
      {kind==='road'&&<><div className="field-row"><label>From<select name="from" required>{places}</select></label><label>To<select name="to" defaultValue={city.nodes[1]?.id} required>{places}</select></label></div><div className="field-row"><label>Road length (km)<input name="distance" type="number" min={.001} step="any" defaultValue={.5} required/></label><label>Travel direction<select name="direction"><option value="two">Both directions</option><option value="one">From → To only</option></select></label></div><p>Both directions creates two linked directions in the road network. New roads require zones and collection plans to be checked again.</p></>}
      {error&&<p role="alert">{error}</p>}
      <button className="primary" disabled={locked || (kind==='bin'&&!city.nodes.length) || (kind==='road'&&city.nodes.length<2)}>Add {kind==='node'?'junction':kind}</button>
      {kind!=='node'&&city.nodes.length<(kind==='road'?2:1)&&<p>Add {kind==='road'?'two junctions':'a junction'} first using the Junction button above.</p>}
    </form>}
  </section>;
}
