import React from 'react';

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'blue', trend }) {
  const colorMap = {
    blue: 'bg-blue-50 text-[#0051A5] dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    red: 'bg-red-50 text-[#E32934] dark:bg-red-950/50 dark:text-red-300 border-red-200 dark:border-red-800',
    green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 shadow-sm hover:shadow-md hover:border-[#0051A5]/40 dark:hover:border-blue-500/40 transition-all duration-200 relative overflow-hidden group select-none">
      {/* Subtle Pepsi Blue Hover Top Accent Indicator */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#0051A5] opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex items-center justify-between">
        <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">
          {title}
        </span>
        {Icon && (
          <div className={`p-2 sm:p-2.5 rounded-xl border ${colorMap[color] || colorMap.blue} transition-transform group-hover:scale-105`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      <div className="mt-2.5 sm:mt-3">
        <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          {value}
        </h3>
        {subtitle && (
          <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
