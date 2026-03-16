import React, { useMemo, useState } from 'react';
import { Activity } from '../types';
import { format } from 'date-fns';
import { getUTC8Date } from '../utils';

interface TrackPosterProps {
  activities: Activity[];
  yearFilter: number | 'All';
  title: string;
}

export default function TrackPoster({ activities, yearFilter, title }: TrackPosterProps) {
  const [minDistance, setMinDistance] = useState<number>(5);

  const filteredActivities = useMemo(() => {
    return activities
      .filter(a => a.distance >= minDistance)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [activities, minDistance]);

  const stats = useMemo(() => {
    if (filteredActivities.length === 0) return null;
    const distances = filteredActivities.map(a => a.distance);
    const total = distances.reduce((sum, d) => sum + d, 0);
    const min = Math.min(...distances);
    const max = Math.max(...distances);
    const avg = total / filteredActivities.length;
    
    // Weekly average (rough estimate based on the year or 365 days)
    const weeks = yearFilter === 'All' ? 52 : 52; 
    const weekly = filteredActivities.length / weeks;

    return {
      number: filteredActivities.length,
      total: total.toFixed(1),
      min: min.toFixed(1),
      max: max.toFixed(1),
      avg: avg.toFixed(1),
      weekly: weekly.toFixed(1)
    };
  }, [filteredActivities, yearFilter]);

  return (
    <div className="bg-[#1a1a1a] rounded-2xl shadow-xl border border-neutral-800 overflow-hidden text-white p-6 md:p-10 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">{title}</h2>
          <p className="text-neutral-500 uppercase tracking-[0.2em] text-xs font-semibold">
            {yearFilter === 'All' ? 'ALL' : `Year ${yearFilter}`}
          </p>
        </div>
        
        <div className="flex flex-col gap-2">
          <label className="text-xs text-neutral-400 uppercase tracking-wider">Min Distance (km)</label>
          <div className="flex items-center gap-4">
            <input 
              type="range" 
              min="0" 
              max="20" 
              step="0.5"
              value={minDistance}
              onChange={(e) => setMinDistance(parseFloat(e.target.value))}
              className="w-32 md:w-48 accent-indigo-500"
            />
            <span className="text-xl font-mono min-w-[3rem]">{minDistance}km</span>
          </div>
        </div>
      </div>

      {filteredActivities.length > 0 ? (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-4 mb-16">
          {filteredActivities.map((activity) => (
            <TrackThumbnail key={activity.id} activity={activity} />
          ))}
        </div>
      ) : (
        <div className="h-64 flex flex-col items-center justify-center text-neutral-500 border border-dashed border-neutral-800 rounded-xl mb-16">
          <p>No activities match the filter.</p>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pt-10 border-t border-neutral-800/50">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 mb-2">Athlete</p>
            <p className="text-2xl font-bold tracking-tight">To5o.Xiao</p>
          </div>
          
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 mb-4">Special Tracks</p>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-yellow-400" />
                <span className="text-xs text-neutral-400">Over 5.0 km</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500" />
                <span className="text-xs text-neutral-400">Over 10.0 km</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-cyan-400" />
                <span className="text-xs text-neutral-400">Other</span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 mb-4">Statistics</p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
              <div className="flex justify-between border-b border-neutral-800/30 pb-1">
                <span className="text-neutral-500">Number:</span>
                <span className="font-mono">{stats.number}</span>
              </div>
              <div className="flex justify-between border-b border-neutral-800/30 pb-1">
                <span className="text-neutral-500">Total:</span>
                <span className="font-mono">{stats.total} km</span>
              </div>
              <div className="flex justify-between border-b border-neutral-800/30 pb-1">
                <span className="text-neutral-500">Weekly:</span>
                <span className="font-mono">{stats.weekly}</span>
              </div>
              <div className="flex justify-between border-b border-neutral-800/30 pb-1">
                <span className="text-neutral-500">Avg:</span>
                <span className="font-mono">{stats.avg} km</span>
              </div>
              <div className="flex justify-between border-b border-neutral-800/30 pb-1">
                <span className="text-neutral-500">Min:</span>
                <span className="font-mono">{stats.min} km</span>
              </div>
              <div className="flex justify-between border-b border-neutral-800/30 pb-1">
                <span className="text-neutral-500">Max:</span>
                <span className="font-mono">{stats.max} km</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const TrackThumbnail: React.FC<{ activity: Activity }> = ({ activity }) => {
  const pathData = useMemo(() => {
    if (!activity.coordinates || activity.coordinates.length < 2) return '';

    // Find bounds
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    activity.coordinates.forEach(([lat, lng]) => {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    });

    const width = maxLng - minLng;
    const height = maxLat - minLat;
    const size = Math.max(width, height);
    
    // Normalize to 100x100
    const scale = size === 0 ? 1 : 90 / size;
    const offsetX = (100 - width * scale) / 2;
    const offsetY = (100 - height * scale) / 2;

    return activity.coordinates.map(([lat, lng], i) => {
      const x = offsetX + (lng - minLng) * scale;
      const y = 100 - (offsetY + (lat - minLat) * scale); // Flip Y for SVG
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(' ');
  }, [activity.coordinates]);

  const color = useMemo(() => {
    if (activity.distance >= 10) return '#ef4444'; // Red
    if (activity.distance >= 5) return '#facc15'; // Yellow
    return '#22d3ee'; // Cyan
  }, [activity.distance]);

  return (
    <div className="aspect-square relative group cursor-help" title={`${activity.distance}km - ${format(getUTC8Date(activity.date), 'MMM d, yyyy')}`}>
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <path 
          d={pathData} 
          fill="none" 
          stroke={color} 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className="transition-all duration-300 group-hover:stroke-white"
        />
      </svg>
    </div>
  );
}
