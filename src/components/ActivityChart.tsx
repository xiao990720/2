import React, { useMemo } from 'react';
import { Activity } from '../types';
import { format, parseISO } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface ActivityChartProps {
  activities: Activity[];
}

export default function ActivityChart({ activities }: ActivityChartProps) {
  const data = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return {
        month: d,
        label: format(d, 'MMM'),
        distance: 0,
        runDistance: 0,
        rideDistance: 0,
        hikeDistance: 0,
      };
    }).reverse();

    activities.forEach(activity => {
      const date = parseISO(activity.date);
      const monthData = months.find(m => m.month.getMonth() === date.getMonth() && m.month.getFullYear() === date.getFullYear());
      if (monthData) {
        monthData.distance += activity.distance;
        if (activity.type === 'Run') monthData.runDistance += activity.distance;
        if (activity.type === 'Ride') monthData.rideDistance += activity.distance;
        if (activity.type === 'Hike') monthData.hikeDistance += activity.distance;
      }
    });

    return months;
  }, [activities]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-xl shadow-lg border border-neutral-100 text-sm">
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-neutral-600">{entry.name}:</span>
              <span className="font-medium">{entry.value.toFixed(1)} km</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <XAxis 
            dataKey="label" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#a3a3a3', fontSize: 12 }}
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#a3a3a3', fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f5f5f5' }} />
          <Bar dataKey="runDistance" name="Run" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
          <Bar dataKey="rideDistance" name="Ride" stackId="a" fill="#6366f1" />
          <Bar dataKey="hikeDistance" name="Hike" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
