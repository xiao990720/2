import React, { useMemo } from 'react';
import { Activity } from '../types';
import { 
  format, 
  eachDayOfInterval, 
  subDays, 
  startOfDay, 
  parseISO,
  startOfWeek,
  endOfWeek
} from 'date-fns';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getUTC8Date } from '../utils';

interface ActivityCalendarProps {
  activities: Activity[];
  yearFilter: number | 'All';
}

export default function ActivityCalendar({ activities, yearFilter }: ActivityCalendarProps) {
  const { startDate, endDate } = useMemo(() => {
    if (yearFilter === 'All') {
      const today = startOfDay(new Date());
      return {
        startDate: subDays(today, 364),
        endDate: today
      };
    } else {
      return {
        startDate: new Date(yearFilter, 0, 1),
        endDate: new Date(yearFilter, 11, 31)
      };
    }
  }, [yearFilter]);

  const activityMap = useMemo(() => {
    const map: Record<string, number> = {};
    activities.forEach(activity => {
      const dateKey = format(getUTC8Date(activity.date), 'yyyy-MM-dd');
      map[dateKey] = (map[dateKey] || 0) + 1;
    });
    return map;
  }, [activities]);

  // Group days into weeks for the grid
  const weeks = useMemo(() => {
    const calendarStartDate = startOfWeek(startDate, { weekStartsOn: 1 }); // Start on Monday
    const calendarEndDate = endOfWeek(endDate, { weekStartsOn: 1 });
    const allDays = eachDayOfInterval({ start: calendarStartDate, end: calendarEndDate });
    
    const weekArray: Date[][] = [];
    for (let i = 0; i < allDays.length; i += 7) {
      weekArray.push(allDays.slice(i, i + 7));
    }
    return weekArray;
  }, [startDate, endDate]);

  const getColorClass = (count: number) => {
    if (count === 0) return 'bg-neutral-100';
    if (count === 1) return 'bg-indigo-200';
    if (count === 2) return 'bg-indigo-400';
    return 'bg-indigo-600';
  };

  const monthLabels = useMemo(() => {
    const labels: { label: string; index: number }[] = [];
    let lastMonth = -1;
    
    weeks.forEach((week, index) => {
      const firstDayOfWeek = week[0];
      const month = firstDayOfWeek.getMonth();
      if (month !== lastMonth) {
        labels.push({ label: format(firstDayOfWeek, 'MMM'), index });
        lastMonth = month;
      }
    });
    return labels;
  }, [weeks]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-neutral-200/60 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Activity Heatmap</h2>
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-full bg-neutral-100" />
            <div className="w-3 h-3 rounded-full bg-indigo-200" />
            <div className="w-3 h-3 rounded-full bg-indigo-400" />
            <div className="w-3 h-3 rounded-full bg-indigo-600" />
          </div>
          <span>More</span>
        </div>
      </div>
      
      <div className="w-full">
        <svg 
          viewBox="0 0 820 130" 
          className="w-full h-auto"
          preserveAspectRatio="xMinYMin meet"
        >
          {/* Month Labels */}
          <g transform="translate(35, 15)">
            {monthLabels.map((m, i) => (
              <text
                key={i}
                x={m.index * 14.5}
                y="0"
                className="fill-neutral-400 text-[10px]"
                textAnchor="start"
              >
                {m.label}
              </text>
            ))}
          </g>

          {/* Day Labels */}
          <g transform="translate(0, 42)" className="fill-neutral-400 text-[10px]">
            <text y="0">Mon</text>
            <text y="29">Wed</text>
            <text y="58">Fri</text>
          </g>

          {/* Grid of Cells */}
          <g transform="translate(35, 30)">
            {weeks.map((week, weekIdx) => (
              <g key={weekIdx} transform={`translate(${weekIdx * 14.5}, 0)`}>
                {week.map((day, dayIdx) => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const count = activityMap[dateKey] || 0;
                  const isOutsideRange = day < startDate || day > endDate;
                  
                  if (isOutsideRange) return null;

                  const colors = {
                    0: '#f5f5f5', // neutral-100
                    1: '#c7d2fe', // indigo-200
                    2: '#818cf8', // indigo-400
                    3: '#4f46e5'  // indigo-600
                  };
                  const color = count >= 3 ? colors[3] : colors[count as keyof typeof colors];

                  return (
                    <circle
                      key={dateKey}
                      cx="6"
                      cy={dayIdx * 14.5 + 6}
                      r="5.5"
                      fill={color}
                      className="transition-all duration-200 hover:stroke-indigo-300 hover:stroke-2"
                    >
                      <title>{`${format(day, 'MMM d, yyyy')}: ${count} activities`}</title>
                    </circle>
                  );
                })}
              </g>
            ))}
          </g>
        </svg>
      </div>
      
      <div className="mt-4 flex items-center justify-between text-xs text-neutral-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          <span>{activities.length} activities in {yearFilter === 'All' ? 'the last year' : yearFilter}</span>
        </div>
        <div className="italic">
          Consistency is key.
        </div>
      </div>
    </div>
  );
}
