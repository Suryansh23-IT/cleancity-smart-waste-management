import { useEffect, useRef, useState } from "react";
import { ArrowRight, Copy, Download, MapPin, Plus, Search, Trash2, Upload } from "lucide-react";
import { City, clone, parseCity, uid } from "../core/model";
import { blankCity } from "../core/presets";
import { generateCity } from "../core/studio";
import { createCuratedCities } from "../core/curated";
import MapSurface from "./MapSurface";
import { streetsFor } from "./mapGeometry";
import { createReadyCities } from '../core/readyCities';
export const readyCities = createReadyCities();
export const curatedCities = createCuratedCities();
export function CityPreview({ city }: {
    city: City;
}) {
    const nodes = new Map(city.nodes.map(n => [n.id, n]));
    const xs = city.nodes.map(n => n.x), ys = city.nodes.map(n => n.y);
    const x = xs.length ? Math.min(...xs) : 0, y = ys.length ? Math.min(...ys) : 0;
    const w = Math.max(...xs, 100) - x, h = Math.max(...ys, 100) - y;
    return <svg className="city-preview" viewBox={`${x - 45} ${y - 45} ${w + 90} ${h + 90}`} role="img" aria-label={`${city.name} road network preview`}>
    <rect x={x - 45} y={y - 45} width={w + 90} height={h + 90} fill="#edf1e8"/>
    <MapSurface city={city} streets={streetsFor(city,id=>nodes.get(id)!)} context={true}/>
    {city.bins.map(b => { const p = b.position ?? nodes.get(b.roadNodeId); return p ? <circle key={b.id} cx={p.x} cy={p.y} r={4} fill={b.fillPercent >= city.settings.urgentThreshold ? '#c77643' : '#438b70'}/> : null; })}
    {city.nodes.filter(n => n.type === 'HEAD').map(n => <rect key={n.id} x={n.x - 8} y={n.y - 8} width={16} height={16} rx={4} fill="#184f42" stroke="white" strokeWidth={3}/>)}
  </svg>;
}
export default function Cities({ city, library, dirty, onOpen, onSave, onDelete, onRename, onError }: {
    city: City;
    library: City[];
    dirty: boolean;
    onOpen: (c: City, destination: string) => void;
    onSave: () => void;
    onDelete: (c: City) => void;
    onRename: (c: City, name: string) => void;
    onError: (message: string) => void;
}) {
    const [tab, setTab] = useState<'saved' | 'templates' | 'ready'>('ready'), [query, setQuery] = useState(''), [creating, setCreating] = useState(false);
    const file = useRef<HTMLInputElement>(null);
    const [renaming, setRenaming] = useState<string | null>(null);
    const createPanel = useRef<HTMLElement>(null);
    useEffect(() => {
        if (!creating)
            return;
        const previous = document.activeElement as HTMLElement | null;
        const panel = createPanel.current;
        panel?.querySelector<HTMLInputElement>('input')?.focus();
        const key = (e: KeyboardEvent) => {
            if (e.key === 'Escape')
                setCreating(false);
            if (e.key !== 'Tab' || !panel)
                return;
            const controls = Array.from(panel.querySelectorAll<HTMLElement>('button,input,select'));
            const first = controls[0], last = controls.at(-1);
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last?.focus();
            }
            if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first?.focus();
            }
        };
        document.addEventListener('keydown', key);
        return () => { document.removeEventListener('keydown', key); previous?.focus(); };
    }, [creating]);
    const source = tab === 'saved' ? library : tab === 'ready' ? readyCities : curatedCities;
    const list = source.filter(c => (c.name + ' ' + c.description).toLowerCase().includes(query.toLowerCase()));
    const copy = (c: City) => { const next = clone(c); next.id = uid('city'); next.name = `${c.name} copy`; onOpen(next, 'City Studio'); };
    const download = (c: City) => { const url = URL.createObjectURL(new Blob([JSON.stringify(c, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = `${c.name.replace(/[^a-z0-9]/gi, '-')}.json`; a.click(); URL.revokeObjectURL(url); };
    return <div className="cities-workspace">
    <section className="library-intro"><div><span className="eyebrow">YOUR MUNICIPAL WORKSPACE</span><h2>Choose a city. Make it yours.</h2><p>Open a saved city, try an example or create your own. Save your working copy to keep it in this browser.</p><div className="library-actions"><button className="primary" onClick={() => setCreating(true)}><Plus size={17}/>Create city</button><button onClick={() => file.current?.click()}><Upload size={16}/>Import JSON</button></div></div><div className="library-local"><MapPin size={24}/><b>Made for exploration</b><p>Deterministic city networks.<br />Real graph-based planning.<br />Saved only in this browser.</p></div></section>
    <section className="current-city-card"><div><span className="eyebrow">CURRENT WORKSPACE</span><h3>{city.name}</h3><p>{city.bins.length} bins · {city.zones.length} zones · {dirty ? 'Unsaved changes' : library.some(c => c.id === city.id) ? 'Saved in this browser' : 'Not saved in this browser'}</p></div><button onClick={onSave}>Save current city</button><button onClick={() => onOpen(city, 'City Studio')}>Continue editing <ArrowRight size={16}/></button><button onClick={() => download(city)} aria-label="Export current city"><Download size={17}/></button></section>
    <div className="library-toolbar"><div className="library-tabs" aria-label="City library source"><button aria-pressed={tab === 'ready'} onClick={() => setTab('ready')}>Simulation-ready cities <span>5</span></button><button aria-pressed={tab === 'templates'} onClick={() => setTab('templates')}>Templates <span>{curatedCities.length}</span></button><button aria-pressed={tab === 'saved'} onClick={() => setTab('saved')}>My cities <span>{library.length}</span></button></div><label className="library-search"><Search size={17}/><input aria-label="Search cities" placeholder="Find a city or scenario…" value={query} onChange={e => setQuery(e.target.value)}/></label></div>
    <p className="library-caption">{tab === 'ready' ? 'Ready to collect: open a city, plan in Dispatch, then start playback. Your saved cities are kept separately.' : tab === 'templates' ? 'A starting point, never a locked template. Open a scenario to create your own working copy.' : 'Your saved cities stay on this device. Export JSON for a portable backup.'}</p>
    <div className="city-card-grid">{list.map((c, i) => <article className="city-library-card" key={c.id}><button className="preview-button" aria-label={`View ${c.name}`} onClick={() => onOpen(tab !== 'saved' ? { ...clone(c), id: uid('city') } : c, tab === 'ready' ? 'Zone & Fleet Operations' : 'Overview')}><CityPreview city={c}/><span className="preview-badge">{tab === 'templates' ? i === 0 ? 'START HERE' : 'SCENARIO' : tab === 'ready' ? 'READY TO SIMULATE' : 'BROWSER SAVE'}</span></button><div className="city-card-content"><h3>{c.name}</h3>{tab === "saved" && (renaming === c.id ? <form className="city-rename-form" onSubmit={e => { e.preventDefault(); const name = String(new FormData(e.currentTarget).get("name")).trim(); if (name) {
        onRename(c, name);
        setRenaming(null);
    } }}><input name="name" aria-label="New city name" defaultValue={c.name} maxLength={160} required autoFocus/><button>Rename</button><button type="button" onClick={() => setRenaming(null)}>Cancel</button></form> : <button className="text-action" onClick={() => setRenaming(c.id)}>Rename city</button>)}<p>{c.description || 'Your custom municipal network.'}</p><div className="city-card-facts"><span>{c.bins.length} bins</span><span>{c.nodes.filter(n => n.type === 'HEAD').length} heads</span><span>{c.roads.length} directed roads</span></div><div className="city-card-actions"><button className="primary" onClick={() => onOpen(tab !== 'saved' ? { ...clone(c), id: uid('city') } : c, tab === 'ready' ? 'Zone & Fleet Operations' : 'City Studio')}>{tab === 'ready' ? 'Continue to Dispatch' : tab === 'templates' ? 'Use scenario' : 'Edit city'}<ArrowRight size={14}/></button><button aria-label={`Duplicate ${c.name}`} onClick={() => copy(c)}><Copy size={16}/> Copy</button><button aria-label={`Export ${c.name}`} onClick={() => download(c)}><Download size={16}/> Export</button>{tab === 'saved' && <button aria-label={`Delete saved ${c.name}`} onClick={() => onDelete(c)}><Trash2 size={16}/> Delete</button>}</div></div></article>)}</div>
    {!list.length && <section className="library-empty"><MapPin size={28}/><h3>{query ? 'No matching cities' : 'Your city library is ready'}</h3><p>{query ? 'Try another name or clear your search.' : 'Create a city or open a curated scenario, then save it to keep it here.'}</p><button onClick={() => query ? setQuery('') : setCreating(true)}>{query ? 'Clear search' : 'Create your first city'}</button></section>}
    <input type="file" ref={file} hidden accept=".json,application/json" onChange={async (e) => { const f = e.target.files?.[0]; if (!f)
        return; try {
        if (f.size > 2000000)
            throw Error('File exceeds 2 MB');
        const c = parseCity(await f.text());
        c.id = uid('city');
        onOpen(c, 'City Studio');
    }
    catch (err) {
        onError(err instanceof Error ? err.message : String(err));
    } e.target.value = ''; }}/>
    {creating && <section ref={createPanel} role="dialog" aria-modal="true" className="create-city-panel panel" aria-label="Create a city"><div className="section-heading"><h3>Give your city a starting point</h3><button onClick={() => setCreating(false)}>Cancel</button></div><form onSubmit={e => { e.preventDefault(); try {
        const f = new FormData(e.currentTarget);
        const name = String(f.get('name')).trim();
        if (!name)
            throw Error('Enter a city name');
        const count = Number(f.get('bins'));
        const c = count ? generateCity({ name, bins: count, junctions: Math.max(18, Math.round(count * .75)), districts: 3, scale: 1, density: .35, oneWay: .1, seed: Number(f.get('seed')) }) : { ...blankCity(), name };
        c.id = uid('city');
        onOpen(c, 'City Studio');
        setCreating(false);
    }
    catch (err) {
        onError(String(err));
    } }}><label>City name<input name="name" required maxLength={160} placeholder="e.g. Eastside Borough" autoFocus/></label><label>Starting layout<select name="bins"><option value="40">Irregular district · 40 bins</option><option value="20">Small neighborhood · 20 bins</option><option value="100">Large city · 100 bins</option><option value="0">Empty canvas · build manually</option></select></label><label>Reproducible seed<input name="seed" type="number" defaultValue={42} min={1} max={999999} required/></label><button className="primary">Create & open Studio <ArrowRight size={16}/></button></form></section>}
  </div>;
}
