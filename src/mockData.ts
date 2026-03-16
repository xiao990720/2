import { Activity, ActivityType } from './types';
import { subDays, formatISO } from 'date-fns';

const CENTER_LAT = 39.9042; // Beijing
const CENTER_LNG = 116.4074;

function generateRandomCoordinates(
  centerLat: number,
  centerLng: number,
  distanceKm: number,
  pointsCount: number = 50
): [number, number][] {
  const coords: [number, number][] = [];
  let currentLat = centerLat + (Math.random() - 0.5) * 0.1;
  let currentLng = centerLng + (Math.random() - 0.5) * 0.1;

  // Roughly 1 degree lat/lng is ~111km
  const stepSize = distanceKm / 111 / pointsCount;

  for (let i = 0; i < pointsCount; i++) {
    coords.push([currentLat, currentLng]);
    // Add some random walk
    currentLat += (Math.random() - 0.5) * stepSize * 2;
    currentLng += (Math.random() - 0.5) * stepSize * 2;
  }
  return coords;
}

export const mockActivities: Activity[] = Array.from({ length: 150 }).map((_, i) => {
  const types: ActivityType[] = ['Run', 'Ride', 'Hike'];
  const type = types[Math.floor(Math.random() * types.length)];
  const date = formatISO(subDays(new Date(), Math.floor(Math.random() * 365)));
  
  let distance = 0;
  let duration = 0;
  let elevationGain = 0;

  if (type === 'Run') {
    distance = Math.random() * 15 + 3; // 3-18 km
    duration = distance * (Math.random() * 100 + 300); // 5-8 min/km
    elevationGain = Math.random() * 100;
  } else if (type === 'Ride') {
    distance = Math.random() * 80 + 10; // 10-90 km
    duration = distance * (Math.random() * 60 + 120); // 2-3 min/km
    elevationGain = Math.random() * 500;
  } else {
    distance = Math.random() * 20 + 5; // 5-25 km
    duration = distance * (Math.random() * 300 + 600); // 10-15 min/km
    elevationGain = Math.random() * 1000 + 200;
  }

  return {
    id: `act-${i}`,
    name: `${type === 'Run' ? 'Morning Run' : type === 'Ride' ? 'Weekend Ride' : 'Mountain Hike'}`,
    type,
    date,
    distance: Number(distance.toFixed(2)),
    duration: Math.floor(duration),
    elevationGain: Math.floor(elevationGain),
    coordinates: generateRandomCoordinates(CENTER_LAT, CENTER_LNG, distance),
  };
}).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
