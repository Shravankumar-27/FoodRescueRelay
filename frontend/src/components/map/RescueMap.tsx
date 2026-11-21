import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import type { LatLngTuple } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
export interface MapPin { id: string; lat: number; lng: number; label: string; sublabel?: string; type: "donor" | "receiver"; capacity?: number; needLevel?: string; badge?: string; distance_km?: number; actionLabel?: string; onAction?: () => void }
interface Props { center?: LatLngTuple; pins?: MapPin[]; showRings?: boolean; className?: string; showOnlyType?: "donor" | "receiver" }
function Markers({ pins }: { pins: MapPin[] }) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  const [tileError, setTileError] = useState(false);
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });
  const coordinateKey = pins.map(p => `${p.lat},${p.lng}`).join(";");
  useEffect(() => { if (pins.length) map.fitBounds(pins.map(p => [p.lat,p.lng] as LatLngTuple), { padding:[35,35], maxZoom:14 }); map.invalidateSize(); }, [coordinateKey, map]);
  const groups = useMemo(() => {
    const cells = new Map<string, MapPin[]>();
    const precision = zoom < 13 ? 1 : zoom < 15 ? 2 : 4;
    pins.forEach(p => { const key = `${p.lat.toFixed(precision)}:${p.lng.toFixed(precision)}`; cells.set(key, [...(cells.get(key) ?? []), p]); });
    return [...cells.values()];
  }, [pins, zoom]);
  return <><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" eventHandlers={{ tileerror: () => setTileError(true), tileload: () => setTileError(false) }}/>
    {tileError && <div className="absolute bottom-6 left-2 z-[500] max-w-[80%] rounded-lg bg-white p-2 text-sm shadow">Map tiles unavailable. Use the partner list to continue.</div>}
    {groups.map(group => { const pin = group[0]; return <Marker key={group.map(p=>p.id).join(":")} position={[pin.lat,pin.lng]} icon={L.divIcon({ className: "partner-marker", html: `<span style="background:${pin.type === "donor" ? "#24664d" : "#2563eb"}">${group.length > 1 ? group.length : pin.type === "donor" ? "D" : "R"}</span>`, iconSize:[36,42], iconAnchor:[18,40] })}><Popup><div className="max-h-64 min-w-48 overflow-y-auto">{group.map(p => <div key={p.id} className="border-b border-border py-2 last:border-0"><strong className="text-sm">{p.label}</strong><p className="text-sm text-muted">{p.sublabel}</p>{p.capacity !== undefined && <p className="text-sm">{p.capacity} servings available</p>}{p.needLevel && <p className="text-sm">{p.needLevel.toLowerCase()} need · {p.badge ?? "NEW"}</p>}{p.distance_km !== undefined && <p className="text-sm">{p.distance_km} km estimated distance</p>}{p.onAction && <button onClick={p.onAction} className="mt-2 min-h-11 rounded-lg bg-primary px-3 text-sm font-semibold text-white">{p.actionLabel ?? "View details"}</button>}</div>)}</div></Popup></Marker>; })}
    <button className="absolute right-3 top-3 z-[500] min-h-11 rounded-xl border border-border bg-white px-3 text-sm font-semibold shadow" onClick={() => { if (pins.length) map.fitBounds(pins.map(p => [p.lat,p.lng] as LatLngTuple), { padding:[40,40], maxZoom:14 }); }}>Fit partners</button>
  </>;
}
export default function RescueMap({ center = [17.4432,78.3773], pins = [], className = "h-80 w-full overflow-hidden rounded-2xl", showOnlyType }: Props) {
  const visible = pins.filter(p => (!showOnlyType || p.type === showOnlyType) && Number.isFinite(p.lat) && Number.isFinite(p.lng));
  return <div className={className} aria-label={showOnlyType === "receiver" ? "Nearby receivers map" : "Nearby donors map"}><MapContainer center={center} zoom={13} scrollWheelZoom={false} className="z-0" style={{height:"100%",width:"100%"}}><Markers pins={visible}/></MapContainer></div>;
}
