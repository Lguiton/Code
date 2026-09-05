import React from 'react';
import { MoreVertical, CheckCircle2, Clock } from 'lucide-react';

export default function LatestProjects() {
  const projects = [
    { name: 'Project Alpha', manager: 'Robert Elsnor', start: '12th Aug, 2026', due: '12th Dec, 2026', status: 'In Progress' },
    { name: 'Project Beta', manager: 'Jack Casner', start: '17th Jul, 2026', due: '17th Nov, 2026', status: 'Completed' },
    { name: 'Wikipoints', manager: 'Denny Dupstor', start: '14th Jul, 2026', due: '14th Dec, 2026', status: 'In Progress' },
    { name: 'Earscan', manager: 'James Joc', start: '10th Jul, 2026', due: '10th Sep, 2026', status: 'In Progress' },
    { name: 'Minnas', manager: 'Kevin Kaul', start: '12th Jun, 2026', due: '12th Dec, 2026', status: 'Completed' },
  ];

  return (
    <div className="bg-[#0a0f1d] border border-slate-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white">Latest Projects</h3>
        <button className="text-xs text-indigo-400 hover:underline">View All</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              <th className="py-3 px-4 w-10">
                <input type="checkbox" className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0" />
              </th>
              <th className="py-3 px-4">Project Name</th>
              <th className="py-3 px-4">Project Manager</th>
              <th className="py-3 px-4">Start Date</th>
              <th className="py-3 px-4">Due Date</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-sm">
            {projects.map((p, index) => (
              <tr key={index} className="hover:bg-slate-900/40 transition-colors">
                <td className="py-4 px-4">
                  <input type="checkbox" className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0" />
                </td>
                <td className="py-4 px-4 font-medium text-white">{p.name}</td>
                <td className="py-4 px-4 text-slate-300">{p.manager}</td>
                <td className="py-4 px-4 text-slate-400">{p.start}</td>
                <td className="py-4 px-4 text-slate-400">{p.due}</td>
                <td className="py-4 px-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    p.status === 'Completed' 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  }`}>
                    {p.status === 'Completed' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                    {p.status}
                  </span>
                </td>
                <td className="py-4 px-4 text-right">
                  <button className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors">
                    <MoreVertical size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between pt-6 mt-4 border-t border-slate-800 text-xs text-slate-400">
        <span>PREV</span>
        <div className="flex items-center gap-2">
          <button className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center">1</button>
          <button className="w-7 h-7 rounded-lg hover:bg-slate-800 text-slate-300 flex items-center justify-center">2</button>
          <button className="w-7 h-7 rounded-lg hover:bg-slate-800 text-slate-300 flex items-center justify-center">3</button>
          <button className="w-7 h-7 rounded-lg hover:bg-slate-800 text-slate-300 flex items-center justify-center">4</button>
          <button className="w-7 h-7 rounded-lg hover:bg-slate-800 text-slate-300 flex items-center justify-center">5</button>
        </div>
        <span className="cursor-pointer hover:text-white">NEXT</span>
      </div>
    </div>
  );
}
