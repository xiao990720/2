import React from 'react';
import { Activity } from '../types';
import { format } from 'date-fns';
import { Bike, Footprints, Mountain } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getUTC8Date, translateName } from '../utils';

interface ActivityListProps {
  activities: Activity[];
  selectedActivity: Activity | null;
  onSelectActivity: (activity: Activity) => void;
}

export default function ActivityList({ activities, selectedActivity, onSelectActivity }: ActivityListProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'Run': return <Footprints className="w-4 h-4 text-emerald-500" />;
      case 'Ride': return <Bike className="w-4 h-4 text-indigo-500" />;
      case 'Hike': return <Mountain className="w-4 h-4 text-amber-500" />;
      default: return <Footprints className="w-4 h-4" />;
    }
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div className="space-y-2">
      {activities.map((activity) => (
        <div 
          key={activity.id}
          onClick={() => onSelectActivity(activity)}
          className={twMerge(
            clsx(
              "p-4 rounded-xl cursor-pointer transition-all duration-200 border",
              selectedActivity?.id === activity.id 
                ? "bg-indigo-50/50 border-indigo-200 shadow-sm" 
                : "bg-white border-transparent hover:bg-neutral-50 hover:border-neutral-200"
            )
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-neutral-100 rounded-lg">
                {getIcon(activity.type)}
              </div>
              <div>
                <h4 className="font-semibold text-neutral-900 text-sm">{translateName(activity.name)}</h4>
                <p className="text-xs text-neutral-500">{format(getUTC8Date(activity.date), 'MMM d, yyyy')}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="font-bold text-neutral-900">{activity.distance.toFixed(1)}</span>
              <span className="text-xs text-neutral-500 ml-1">km</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 mt-3 text-xs text-neutral-500">
            <div className="flex items-center gap-1">
              <span className="font-medium text-neutral-700">{formatDuration(activity.duration)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-medium text-neutral-700">{activity.elevationGain}m</span> elev
            </div>
            <div className="flex items-center gap-1">
              <span className="font-medium text-neutral-700">
                {activity.type === 'Ride' ? (
                  `${(activity.distance / (activity.duration / 3600)).toFixed(1)} km/h`
                ) : (
                  `${Math.floor(activity.duration / 60 / activity.distance)}:${Math.floor((activity.duration / activity.distance) % 60).toString().padStart(2, '0')} /km`
                )}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
