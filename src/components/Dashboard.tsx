import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActivityType, Activity } from '../types';
import Sidebar from './Sidebar';
import StatCard from './StatCard';
import ActivityList from './ActivityList';
import ActivityMap from './ActivityMap';
import ActivityCalendar from './ActivityCalendar';
import TrackPoster from './TrackPoster';
import { Activity as ActivityIcon, Bike, Footprints, Map as MapIcon, TrendingUp, Settings, Menu, X } from 'lucide-react';
import { parseISO, isWithinInterval, startOfDay, endOfDay, format } from 'date-fns';
import { Calendar, ChevronDown } from 'lucide-react';
import { getUTC8Date } from '../utils';
import { DateRangePicker } from './ui/date-range-picker';
import { DateRange } from 'react-day-picker';

export default function Dashboard() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filter, setFilter] = useState<ActivityType>('All');
  const [yearFilter, setYearFilter] = useState<number | 'All'>('All');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // List specific filters
  const [filterRange, setFilterRange] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined
  });

  const navigate = useNavigate();

  const fetchActivities = async () => {
    try {
      const res = await fetch('/api/activities');
      const data = await res.json();
      setActivities(data);
    } catch (err) {
      console.error("Failed to fetch activities:", err);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  // Reset selected activity when filters change so the map shows all trajectories for the selected filter
  useEffect(() => {
    setSelectedActivity(null);
  }, [filter, yearFilter]);

  const activitiesByType = useMemo(() => {
    if (filter === 'All') return activities;
    return activities.filter(a => a.type === filter);
  }, [activities, filter]);

  const availableYears = useMemo(() => {
    const years = new Set(activitiesByType.map(a => parseISO(a.date).getFullYear()));
    return Array.from(years).sort((a: number, b: number) => b - a);
  }, [activitiesByType]);

  useEffect(() => {
    if (yearFilter !== 'All' && !availableYears.includes(yearFilter)) {
      setYearFilter('All');
    }
  }, [availableYears, yearFilter]);

  const filteredActivities = useMemo(() => {
    let result = activitiesByType;
    if (yearFilter !== 'All') {
      result = result.filter(a => parseISO(a.date).getFullYear() === yearFilter);
    }
    if (filterRange?.from || filterRange?.to) {
      const start = filterRange.from ? startOfDay(filterRange.from) : new Date(0);
      const end = filterRange.to ? endOfDay(filterRange.to) : new Date(8640000000000000);
      result = result.filter(a => isWithinInterval(getUTC8Date(a.date), { start, end }));
    }
    return result;
  }, [activitiesByType, yearFilter, filterRange]);

  const listActivities = useMemo(() => {
    let result = [...filteredActivities].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (!filterRange?.from && !filterRange?.to) {
      return result.slice(0, 10);
    }
    return result;
  }, [filteredActivities, filterRange]);

  const totalDistance = filteredActivities.reduce((sum, a) => sum + a.distance, 0);
  const totalActivities = filteredActivities.length;
  const totalElevation = filteredActivities.reduce((sum, a) => sum + a.elevationGain, 0);
  const longestDistance = Math.max(...filteredActivities.map(a => a.distance), 0);

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50 text-neutral-900 font-sans">
      <Sidebar 
        filter={filter} 
        setFilter={setFilter} 
        yearFilter={yearFilter}
        setYearFilter={setYearFilter}
        availableYears={availableYears}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />
      
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-10 relative">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 bg-white border border-neutral-200 rounded-lg lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-neutral-900">
                {filter === 'All' ? 'All Activities' : `${filter}s`}
                {yearFilter !== 'All' && <span className="text-neutral-400 ml-2">({yearFilter})</span>}
              </h1>
              <p className="text-neutral-500 mt-1 text-sm md:text-base">
                Tracking your progress and adventures.
              </p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/admin')}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors shadow-sm w-full md:w-auto"
          >
            <Settings className="w-4 h-4" />
            <span className="font-medium text-sm">Manage Data</span>
          </button>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <StatCard 
            title="Total Distance" 
            value={`${totalDistance.toFixed(1)} km`} 
            icon={<MapIcon className="w-5 h-5 text-indigo-500" />} 
          />
          <StatCard 
            title="Total Activities" 
            value={totalActivities} 
            icon={<ActivityIcon className="w-5 h-5 text-emerald-500" />} 
          />
          <StatCard 
            title="Total Elevation" 
            value={`${totalElevation.toFixed(0)} m`} 
            icon={<TrendingUp className="w-5 h-5 text-amber-500" />} 
          />
          <StatCard 
            title="Longest Distance" 
            value={`${longestDistance.toFixed(1)} km`} 
            icon={<Footprints className="w-5 h-5 text-rose-500" />} 
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-8 mb-8">
          <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-neutral-200/60 overflow-hidden h-[600px]">
            <ActivityMap 
              activities={filteredActivities} 
              selectedActivity={selectedActivity} 
            />
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-neutral-200/60 overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent Activities</h2>
              
              <div className="flex items-center gap-2">
                <DateRangePicker 
                  date={filterRange}
                  setDate={setFilterRange}
                />
              </div>
            </div>
            <div className="p-2 overflow-y-auto flex-1">
              <ActivityList 
                activities={listActivities} 
                selectedActivity={selectedActivity}
                onSelectActivity={setSelectedActivity} 
              />
              {listActivities.length === 0 && (
                <div className="py-20 text-center text-neutral-400 text-sm">
                  No activities found.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6 md:space-y-8">
          <ActivityCalendar activities={filteredActivities} yearFilter={yearFilter} />

          <TrackPoster 
            activities={filteredActivities} 
            yearFilter={yearFilter} 
            title={filter === 'All' ? 'Activities' : filter} 
          />
        </div>
      </main>
    </div>
  );
}
