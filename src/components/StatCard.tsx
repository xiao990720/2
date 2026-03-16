import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}

export default function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-200/60 flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-neutral-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-neutral-900">{value}</h3>
      </div>
      <div className="p-3 bg-neutral-50 rounded-xl">
        {icon}
      </div>
    </div>
  );
}
