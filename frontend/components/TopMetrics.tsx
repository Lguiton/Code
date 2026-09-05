import React from 'react';
import { TrendingUp, ArrowUpRight } from 'lucide-react';

export default function TopMetrics() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
      {/* Total Revenue Card */}
      <div className="bg-[#0a0f1d] border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Revenue</h3>
          <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-lg font-semibold flex items-center gap-1">
            <TrendingUp size={12} /> +12.4%
          </span>
        </div>
        <div className="flex items-center justify-between my-2">
          <div>
            <p className="text-3xl font-extrabold text-white tracking-tight">$101.23</p>
            <p className="text-xs text-slate-500 mt-1">IN CRORE</p>
          </div>
          {/* Donut Simulation */}
          <div className="relative w-24 h-24 rounded-full border-4 border-indigo-500/20 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent"></div>
            <div className="text-center">
              <span className="text-xs font-bold text-indigo-400">55%</span>
              <span className="block text-[9px] text-slate-500">PROFIT</span>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-800/80 pt-4 mt-2 flex items-center justify-between text-xs text-slate-400">
          <span>Month Range: <strong>January - August</strong></span>
          <span>Year: <strong>2026</strong></span>
        </div>
      </div>

      {/* Total Productivity Card */}
      <div className="bg-[#0a0f1d] border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Productivity</h3>
          <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-lg font-semibold">
            Year - 2026
          </span>
        </div>
        <div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">62%</span>
            <span className="text-xs text-emerald-400 flex items-center font-medium"><ArrowUpRight size={14} /> +8.1% vs last month</span>
          </div>
          {/* SVG Trend Wave */}
          <div className="h-20 w-full mt-2 relative">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 300 70" fill="none">
              <path d="M0 50 Q 75 10, 150 40 T 300 20" stroke="#6366f1" strokeWidth="3" fill="none" />
              <path d="M0 50 Q 75 10, 150 40 T 300 20 L 300 70 L 0 70 Z" fill="url(#gradient)" opacity="0.2" />
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
        <div className="border-t border-slate-800/80 pt-4 mt-2 flex items-center justify-between text-xs text-slate-400">
          <span>Peak: <strong>May</strong></span>
          <span>Average: <strong>44.5</strong></span>
        </div>
      </div>

      {/* Date and Time Card */}
      <div className="bg-[#0a0f1d] border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Date and Time</h3>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>
        <div className="py-4">
          <h4 className="text-2xl font-black text-white tracking-tight">19TH AUG, 2026</h4>
          <p className="text-xl font-mono text-indigo-400 mt-1">13:55:18</p>
        </div>
        <div className="border-t border-slate-800/80 pt-4 mt-2 flex items-center justify-between text-xs text-slate-400">
          <span>Timezone: <strong>UTC-7 (PDT)</strong></span>
          <span className="text-emerald-400 font-semibold">Active Sync</span>
        </div>
      </div>
    </div>
  );
}
