import {showcaseArtwork,isBoardShowcase} from '../core/showcaseLayout';
import { City } from "../core/model";
import { Street, polygon, landParcels, footprints } from "./mapGeometry";
import { useMemo } from "react";
export default function MapSurface({
  city,
  streets,
  context,
}: {
  city: City;
  streets: Street[];
  context: boolean;
}) {
  const board = isBoardShowcase(city);
  const artwork = useMemo(() => board ? showcaseArtwork(city, false) : "", [board, city.nodes, city.roads, city.bins]);
  const parcels = useMemo(() => !board && context ? landParcels(city) : [], [board, context, city.nodes]);
  const buildings = useMemo(
    () => !board && context ? footprints(city, streets) : [],
    [board, context, city.nodes, streets],
  );
  if(board)return <g className="shared-showcase-board" pointerEvents="none" dangerouslySetInnerHTML={{__html:artwork}}/>;
  return (
    <g className="urban-surface" pointerEvents="none">
      {context && (
        <g className="land-context">
          {parcels.map((p) => (
            <polygon
              key={p.id}
              points={polygon(p.points)}
              fill={
                p.park ? "#d8e8cd" : ["#f0eee3", "#f5f2e9", "#eceee2"][p.shade]
              }
            />
          ))}
          {buildings.map((b) => (
            <polygon
              key={b.id}
              points={polygon(b.points)}
              fill="#e0ddcf"
              stroke="#d5d3c7"
              strokeWidth=".6"
            />
          ))}
          {city.description.startsWith('Warehouse yards') && <g aria-label="Illustrative warehouse buildings" fill="#d4d9d5" stroke="#b6c1ba" strokeWidth="1.5">
            {Array.from({length:15},(_,i)=><g key={i}><rect x={155+(i%5)*170} y={190+Math.floor(i/5)*165} width="88" height="60" rx="3"/><path d={`M${159+(i%5)*170},${220+Math.floor(i/5)*165} h80`} fill="none" stroke="#b6c1ba"/></g>)}
          </g>}
          {city.description.includes('River Willow separates') && <g aria-label="Illustrative River Willow, crossed only by graph roads">
            <path d="M550,-50 C535,170 565,290 550,400 S535,630 550,810" fill="none" stroke="#bcdce2" strokeWidth="85"/>
            <path d="M550,-50 C535,170 565,290 550,400 S535,630 550,810" fill="none" stroke="#a7cfd8" strokeWidth="2"/>
            <text x="550" y="440" textAnchor="middle" fill="#467a87" fontSize="12" transform="rotate(-90 550 440)">RIVER WILLOW</text>
          </g>}
        </g>
      )}
      <g
        className="street-casings"
        fill="none"
        stroke="#c3cfc2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {streets.map((s) => (
          <path
            key={s.id}
            data-street={s.id}
            d={s.path}
            strokeWidth={s.major ? 19 : 12}
          />
        ))}
      </g>
      <g
        className="street-surfaces"
        fill="none"
        stroke="#fffefa"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {streets.map((s) => (
          <path key={s.id} d={s.path} strokeWidth={s.major ? 15 : 8} />
        ))}
      </g>
      <g fill="none" stroke="#ddd8b9" strokeWidth="1" strokeDasharray="9 9">
        {streets
          .filter((s) => s.major)
          .map((s) => (
            <path key={s.id} d={s.path} />
          ))}
      </g>
      <g className="street-names">
        {streets
          .filter((s) => s.major && s.length > 150 && s.roads[0].name)
          .map((s) => {
            let angle =
              (Math.atan2(s.b.y - s.a.y, s.b.x - s.a.x) * 180) / Math.PI;
            if (angle > 90 || angle < -90) angle += 180;
            return (
              <text
                key={s.id}
                transform={`translate(${(s.a.x + s.b.x) / 2},${(s.a.y + s.b.y) / 2}) rotate(${angle})`}
                textAnchor="middle"
                y="-5"
                fill="#6a7761"
                stroke="#fffefa"
                strokeWidth="4"
                paintOrder="stroke"
                fontSize="11"
              >
                {s.roads[0].name}
              </text>
            );
          })}
      </g>
    </g>
  );
}
