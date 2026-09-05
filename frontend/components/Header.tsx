import React from 'react';
import { Search, Sun, Bell, Mail, Globe } from 'lucide-react';

export default function Header() {
  return (
    <header className="h-20 bg-[#0a0f1d]/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 px-8 flex items-center justify-between">
      <div className="relative w-96">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="Search..." 
          className="w-full bg-slate-900/80 border border-slate-800 text-slate-200 pl-10 pr-4 py-2 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-500"
        />
      </div>

      <div className="flex items-center gap-4">
        <button className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white transition-colors">
          <Sun size={15} className="text-amber-400" /> Light Mode
        </button>

        <button className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white transition-colors">
          <Globe size={15} className="text-indigo-400" /> English
        </button>

        <button className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-700 transition-colors relative">
          <Bell size={18} />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-indigo-500"></span>
        </button>

        <button className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-700 transition-colors">
          <Mail size={18} />
        </button>
      </div>
    </header>
  );
}
