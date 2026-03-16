export type ActivityType = 'Run' | 'Ride' | 'Hike' | 'All';

export interface Activity {
  id: string;
  name: string;
  type: ActivityType;
  date: string; // ISO string
  distance: number; // in km
  duration: number; // in seconds
  elevationGain: number; // in meters
  coordinates: [number, number][]; // [lat, lng] array
}
