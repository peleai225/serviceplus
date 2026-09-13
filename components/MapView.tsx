import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix default marker icons (Leaflet + Vite issue)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface MapViewProps {
  clientLat?: number;
  clientLng?: number;
  providerLat?: number;
  providerLng?: number;
  locationLabel?: string;
  providerName?: string;
  className?: string;
}

// Default center = Abidjan, Plateau
const DEFAULT_LAT = 5.3169;
const DEFAULT_LNG = -4.0166;

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 14);
  }, [lat, lng, map]);
  return null;
}

const MapView: React.FC<MapViewProps> = ({
  clientLat,
  clientLng,
  providerLat,
  providerLng,
  locationLabel = 'Lieu de la mission',
  providerName = 'Prestataire',
  className = 'h-48 w-full rounded-2xl overflow-hidden',
}) => {
  const centerLat = clientLat ?? providerLat ?? DEFAULT_LAT;
  const centerLng = clientLng ?? providerLng ?? DEFAULT_LNG;

  return (
    <div className={className} style={{ zIndex: 0 }}>
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={14}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <RecenterMap lat={centerLat} lng={centerLng} />

        {clientLat && clientLng && (
          <Marker position={[clientLat, clientLng]}>
            <Popup>{locationLabel}</Popup>
          </Marker>
        )}

        {providerLat && providerLng && (
          <Marker position={[providerLat, providerLng]} icon={greenIcon}>
            <Popup>{providerName} — En route</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

export default MapView;
