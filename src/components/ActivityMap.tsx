import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, useMap, Marker } from 'react-leaflet';
import { Activity } from '../types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { translateName } from '../utils';

interface ActivityMapProps {
  activities: Activity[];
  selectedActivity: Activity | null;
}

function MapUpdater({ selectedActivity, activities }: { selectedActivity: Activity | null, activities: Activity[] }) {
  const map = useMap();

  useEffect(() => {
    if (selectedActivity && selectedActivity.coordinates.length > 0) {
      map.fitBounds(selectedActivity.coordinates, { padding: [50, 50] });
    } else if (activities.length > 0) {
      // Fit to all activities
      const allCoords = activities.flatMap(a => a.coordinates);
      if (allCoords.length > 0) {
        map.fitBounds(allCoords, { padding: [50, 50] });
      }
    }
  }, [selectedActivity, activities, map]);

  return null;
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; // Distance in km
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

export default function ActivityMap({ activities, selectedActivity }: ActivityMapProps) {
  const getColor = (type: string) => {
    switch (type) {
      case 'Run': return '#10b981'; // emerald-500
      case 'Ride': return '#6366f1'; // indigo-500
      case 'Hike': return '#f59e0b'; // amber-500
      default: return '#6366f1';
    }
  };

  const kmMarkers = useMemo(() => {
    if (!selectedActivity) return [];
    const markers: { lat: number, lng: number, km: number }[] = [];
    let accumulatedDistance = 0;
    let nextKm = 1;

    const coords = selectedActivity.coordinates;
    for (let i = 1; i < coords.length; i++) {
      const [lat1, lng1] = coords[i - 1];
      const [lat2, lng2] = coords[i];
      const dist = getDistance(lat1, lng1, lat2, lng2);
      accumulatedDistance += dist;

      if (accumulatedDistance >= nextKm) {
        markers.push({ lat: lat2, lng: lng2, km: nextKm });
        nextKm++;
      }
    }
    return markers;
  }, [selectedActivity]);

  const createKmIcon = (km: number, color: string) => {
    return L.divIcon({
      className: 'custom-km-marker',
      html: `<div style="background-color: white; border: 2px solid ${color}; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; color: ${color}; box-shadow: 0 1px 3px rgba(0,0,0,0.3);">${km}</div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
  };

  return (
    <div className="relative w-full h-full">
      {selectedActivity && (
        <div className="absolute top-4 left-4 z-[400] bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-md border border-neutral-200 min-w-[280px]">
          <h3 className="font-bold text-lg text-neutral-900">{translateName(selectedActivity.name)}</h3>
          <div className="flex justify-between gap-6 mt-3">
            <div>
              <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Distance</p>
              <p className="font-bold text-neutral-900 text-lg">{selectedActivity.distance.toFixed(2)} <span className="text-sm font-normal text-neutral-500">km</span></p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Time</p>
              <p className="font-bold text-neutral-900 text-lg">{formatDuration(selectedActivity.duration)}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Pace</p>
              <p className="font-bold text-neutral-900 text-lg">
                {selectedActivity.type === 'Ride'
                  ? `${(selectedActivity.distance / (selectedActivity.duration / 3600)).toFixed(1)}`
                  : `${Math.floor(selectedActivity.duration / 60 / selectedActivity.distance)}:${Math.floor((selectedActivity.duration / selectedActivity.distance) % 60).toString().padStart(2, '0')}`}
                <span className="text-sm font-normal text-neutral-500">
                  {selectedActivity.type === 'Ride' ? ' km/h' : ' /km'}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}
      <MapContainer 
        center={[39.9042, 116.4074]} 
        zoom={11} 
        className="w-full h-full z-0"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        
        {selectedActivity ? (
          <Polyline 
            key={selectedActivity.id}
            positions={selectedActivity.coordinates}
            pathOptions={{ 
              color: getColor(selectedActivity.type),
              weight: 4,
              opacity: 1
            }}
          />
        ) : (
          activities.map(activity => (
            <Polyline 
              key={activity.id}
              positions={activity.coordinates}
              pathOptions={{ 
                color: getColor(activity.type),
                weight: 2,
                opacity: 0.6
              }}
            />
          ))
        )}

        {selectedActivity && kmMarkers.map((marker, index) => (
          <Marker 
            key={index} 
            position={[marker.lat, marker.lng]} 
            icon={createKmIcon(marker.km, getColor(selectedActivity.type))}
          />
        ))}
        
        <MapUpdater selectedActivity={selectedActivity} activities={activities} />
      </MapContainer>
    </div>
  );
}
