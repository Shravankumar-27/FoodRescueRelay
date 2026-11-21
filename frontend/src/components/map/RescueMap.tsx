import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import type { LatLngTuple } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet's default icon path broken by webpack/vite
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Donor pin — green
const donorIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;base64," +
    btoa(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 24 12 24s12-15 12-24C24 5.37 18.63 0 12 0z" fill="#16A34A"/>
        <circle cx="12" cy="12" r="6" fill="white"/>
      </svg>`,
    ),
  iconSize: [24, 36],
  iconAnchor: [12, 36],
  popupAnchor: [0, -36],
});

// Receiver pin — blue
const receiverIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;base64," +
    btoa(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 24 12 24s12-15 12-24C24 5.37 18.63 0 12 0z" fill="#2563EB"/>
        <circle cx="12" cy="12" r="6" fill="white"/>
      </svg>`,
    ),
  iconSize: [24, 36],
  iconAnchor: [12, 36],
  popupAnchor: [0, -36],
});

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  label: string;
  sublabel?: string;
  type: "donor" | "receiver";
}

interface RescueMapProps {
  center?: LatLngTuple;
  pins?: MapPin[];
  showRings?: boolean;
  className?: string;
}

// Default centre: Madhapur, Hyderabad
const DEFAULT_CENTER: LatLngTuple = [17.4432, 78.3773];

export default function RescueMap({
  center = DEFAULT_CENTER,
  pins = [],
  showRings = true,
  className = "h-72 w-full rounded-2xl overflow-hidden",
}: RescueMapProps) {
  useEffect(() => {
    // Re-invalidate Leaflet size when DOM changes (e.g. tab show)
    window.dispatchEvent(new Event("resize"));
  }, []);

  return (
    <div className={className}>
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Distance rings at 2 km and 5 km */}
        {showRings && (
          <>
            <Circle
              center={center}
              radius={2000}
              pathOptions={{ color: "#16A34A", fillColor: "#16A34A", fillOpacity: 0.04, weight: 1.5, dashArray: "6 4" }}
            />
            <Circle
              center={center}
              radius={5000}
              pathOptions={{ color: "#2563EB", fillColor: "#2563EB", fillOpacity: 0.02, weight: 1, dashArray: "4 6" }}
            />
          </>
        )}

        {pins.map((pin) => (
          <Marker
            key={pin.id}
            position={[pin.lat, pin.lng]}
            icon={pin.type === "donor" ? donorIcon : receiverIcon}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{pin.label}</p>
                {pin.sublabel && <p className="text-muted">{pin.sublabel}</p>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
