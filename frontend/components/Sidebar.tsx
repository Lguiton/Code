import React from 'react';
import {
  LayoutDashboard,
  ClipboardCheck,
  FileText,
  Camera,
  Lock,
} from 'lucide-react';

export type AppTab = 'dashboard' | 'review' | 'reports' | 'log';

const NAV: { id: AppTab; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { id: 'review', label: 'Review Queue', icon: <ClipboardCheck size={18} /> },
  { id: 'reports', label: 'Reports', icon: <FileText size={18} /> },
  { id: 'log', label: 'Log Compliance', icon: <Camera size={18} /> },
];

export default function Sidebar({
  tab,
  onTab,
  operatorCode,
  onLogout,
}: {
  tab: AppTab;
  onTab: (t: AppTab) => void;
  operatorCode: string;
  onLogout: () => void;
}) {
  return (
    <aside className="w-64 bg-[#0a0f1d] border-r border-slate-800 flex flex-col justify-between h-screen fixed left-0 top-0 text-slate-300">
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white">
            E
          </div>
          <div>
            <span className="text-lg font-bold text-white tracking-wide block leading-none">
              Eivanta
            </span>
            <span className="text-[10px] uppercase tracking-widest text-slate-500">
              Compliance logging
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
          <div className="w-10 h-10 rounded-full bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm">
            {operatorCode.slice(0, 2).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <h4 className="text-sm font-semibold text-white truncate">{operatorCode}</h4>
            <p className="text-xs text-slate-400 truncate">Signed in</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500 px-3 mb-3">
          Terminal
        </p>
        <nav className="space-y-1">
          {NAV.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-800">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 text-sm transition-colors"
        >
          <Lock size={18} /> Lock Terminal
        </button>
      </div>
    </aside>
  );
}
