import React from 'react';

export default function SecondaryMetrics() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
      {/* Today's Sales */}
      <div className="bg-[#0a0f1d] border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Today's Sales</h3>
        <div className="flex items-center justify-center my-4">
          <div className="relative w-28 h-28 rounded-full border-4 border-indigo-500/20 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-r-transparent"></div>
            <div className="text-center">
              <span className="text-2xl font-black text-white">75%</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-center text-slate-400">Total <strong>10 Products</strong></p>
      </div>

      {/* Daily Visitors */}
      <div className="bg-[#0a0f1d] border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Daily Visitors</h3>
        <div className="flex items-center justify-center my-4">
          <div className="relative w-28 h-28 rounded-full border-4 border-emerald-500/20 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-l-transparent"></div>
            <div className="text-center">
              <span className="text-2xl font-black text-white">60%</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-center text-slate-400">Total <strong>25,987 Visitors</strong></p>
      </div>

      {/* Orders Track */}
      <div className="bg-[#0a0f1d] border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Orders Track</h3>
        <div className="flex items-end justify-between h-28 px-2 gap-2 pb-2 border-b border-slate-800">
          <div className="w-8 bg-indigo-500/30 hover:bg-indigo-500 rounded-t-lg transition-all h-[40%]"></div>
          <div className="w-8 bg-indigo-500/50 hover:bg-indigo-500 rounded-t-lg transition-all h-[70%]"></div>
          <div className="w-8 bg-indigo-600 rounded-t-lg transition-all h-[95%]"></div>
          <div className="w-8 bg-indigo-500/40 hover:bg-indigo-500 rounded-t-lg transition-all h-[60%]"></div>
        </div>
        <div className="flex justify-between items-center mt-3 text-xs text-slate-400">
          <span>Apr - Jul</span>
          <strong className="text-white">Total 512 Orders</strong>
        </div>
      </div>

      {/* Pending Orders */}
      <div className="bg-[#0a0f1d] border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Pending Orders</h3>
        <div className="flex items-center justify-center my-4">
          <div className="relative w-28 h-28 rounded-full border-4 border-amber-500/20 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-amber-500 border-b-transparent"></div>
            <div className="text-center">
              <span className="text-2xl font-black text-white">30%</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-center text-slate-400">Total <strong>155 Orders</strong></p>
      </div>
    </div>
  );
}
