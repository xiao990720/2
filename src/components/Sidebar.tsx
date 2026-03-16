import React, { useState, useEffect } from 'react';
import { ActivityType } from '../types';
import { Activity, Bike, Footprints, Map as MapIcon, Mountain } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface SidebarProps {
  filter: ActivityType;
  setFilter: (type: ActivityType) => void;
  yearFilter: number | 'All';
  setYearFilter: (year: number | 'All') => void;
  availableYears: number[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export default function Sidebar({ 
  filter, 
  setFilter, 
  yearFilter, 
  setYearFilter, 
  availableYears,
  isOpen,
  setIsOpen,
  isCollapsed,
  setIsCollapsed
}: SidebarProps) {
  const [dashboardConfig, setDashboardConfig] = useState({ icon: 'Activity', title: 'Sport Dash', username: 'To5o.Xiao', userInfo: '', userLink: '' });

  useEffect(() => {
    fetch('/api/settings/dashboard')
      .then(res => res.json())
      .then(data => setDashboardConfig(data))
      .catch(err => console.error("Failed to fetch Dashboard config", err));
  }, []);

  const navItems: { type: ActivityType; icon: React.ReactNode; label: string }[] = [
    { type: 'All', icon: <MapIcon className="w-5 h-5" />, label: 'All Activities' },
    { type: 'Run', icon: <Footprints className="w-5 h-5" />, label: 'Running' },
    { type: 'Ride', icon: <Bike className="w-5 h-5" />, label: 'Cycling' },
    { type: 'Hike', icon: <Mountain className="w-5 h-5" />, label: 'Hiking' },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={twMerge(
        clsx(
          "fixed inset-y-0 left-0 z-50 bg-white border-r border-neutral-200 transition-all duration-300 ease-in-out flex flex-col overflow-y-auto lg:static lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
          isCollapsed ? "w-20" : "w-64"
        )
      )}>
        <div className={twMerge(
          clsx(
            "flex items-center gap-3 mb-10 p-6",
            isCollapsed ? "justify-center" : "justify-start"
          )
        )}>
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          {!isCollapsed && <span className="font-bold text-xl tracking-tight text-neutral-900">{dashboardConfig.title}</span>}
        </div>

        <nav className="space-y-2 flex-1 px-3">
          {navItems.map((item) => (
            <div key={item.type} className="space-y-1">
              <button
                onClick={() => {
                  setFilter(item.type);
                  setYearFilter('All');
                  if (window.innerWidth < 1024) setIsOpen(false);
                }}
                title={isCollapsed ? item.label : undefined}
                className={twMerge(
                  clsx(
                    "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors duration-200",
                    isCollapsed ? "justify-center" : "justify-start",
                    filter === item.type 
                      ? "bg-indigo-50 text-indigo-700" 
                      : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                  )
                )}
              >
                {item.icon}
                {!isCollapsed && <span>{item.label}</span>}
              </button>
              
              {/* Sub-options for years if this item is selected */}
              {filter === item.type && !isCollapsed && (
                <div className="pl-11 pr-4 py-1 space-y-1">
                  {availableYears.map(year => (
                    <button
                      key={year}
                      onClick={() => setYearFilter(year)}
                      className={twMerge(
                        clsx(
                          "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors duration-200",
                          yearFilter === year
                            ? "bg-indigo-50 text-indigo-700 font-medium"
                            : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
                        )
                      )}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="mt-auto p-4 border-t border-neutral-200 shrink-0">
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex w-full items-center justify-center p-2 mb-4 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg transition-colors"
          >
            <Activity className={twMerge(clsx("w-5 h-5 transition-transform", isCollapsed ? "rotate-180" : ""))} />
          </button>

          <div className={twMerge(
            clsx(
              "flex items-center gap-3 px-2 py-2",
              isCollapsed ? "justify-center" : "justify-start"
            )
          )}>
            <img 
              src="https://picsum.photos/seed/clouds/100/100" 
              alt="User" 
              className="w-10 h-10 rounded-full border border-neutral-200 shrink-0"
              referrerPolicy="no-referrer"
            />
            {!isCollapsed && (
              <div className="flex flex-col text-left overflow-hidden">
                {dashboardConfig.userLink ? (
                  <a href={dashboardConfig.userLink} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-neutral-900 truncate hover:underline">
                    {dashboardConfig.username}
                  </a>
                ) : (
                  <span className="text-sm font-semibold text-neutral-900 truncate">{dashboardConfig.username}</span>
                )}
                {dashboardConfig.userInfo && <span className="text-xs text-neutral-500 truncate">{dashboardConfig.userInfo}</span>}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
