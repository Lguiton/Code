import React from 'react';
import { 
  FolderKanban, 
  Kanban, 
  CheckSquare, 
  Settings, 
  LogOut,
  Plus
} from 'lucide-react';

export default function Sidebar() {
  return (
    <aside className="w-64 bg-[#0a0f1d] border-r border-slate-800 flex flex-col justify-between h-screen fixed left-0 top-0 text-slate-300">
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white">
            H
          </div>
          <span className="text-lg font-bold text-white tracking-wide">HupTech</span>
        </div>

        <div className="flex items-center gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
          <img 
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces" 
            alt="User profile" 
            className="w-10 h-10 rounded-full object-cover"
          />
          <div className="overflow-hidden">
            <h4 className="text-sm font-semibold text-white truncate">Smith Waves</h4>
            <p className="text-xs text-slate-400 truncate">Ahmedabad, Gujarat</p>
          </div>
        </div>

        <button className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2.5 px-4 rounded-xl transition-colors shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2">
          <Plus size={16} /> Create New Project
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        <div>
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500 px-3 mb-3">Projects</p>
          <nav className="space-y-1">
            <a href="#" className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 text-sm font-medium">
              <span className="flex items-center gap-3"><FolderKanban size={18} /> Ear Scan</span>
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            </a>
            <a href="#" className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-900 text-slate-400 hover:text-slate-200 text-sm font-medium transition-colors">
              <span className="flex items-center gap-3"><Kanban size={18} /> Project Alpha</span>
            </a>
            <a href="#" className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-900 text-slate-400 hover:text-slate-200 text-sm font-medium transition-colors">
              <span className="flex items-center gap-3"><CheckSquare size={18} /> Project Beta</span>
            </a>
          </nav>
        </div>
      </div>

      <div className="p-4 border-t border-slate-800 space-y-1">
        <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 text-sm transition-colors">
          <Settings size={18} /> Settings
        </a>
        <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 text-sm transition-colors">
          <LogOut size={18} /> Logout
        </a>
      </div>
    </aside>
  );
}
