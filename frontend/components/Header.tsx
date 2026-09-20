import React from 'react';

const TITLES: Record<string, { title: string; sub: string }> = {
  dashboard: {
    title: 'Compliance Dashboard',
    sub: 'Live overview of this kitchen’s compliance logs',
  },
  review: {
    title: 'Review Queue',
    sub: 'Approve or override AI-flagged logs',
  },
  reports: {
    title: 'Reports',
    sub: 'Monthly aggregates and audit-ready PDF export',
  },
  log: {
    title: 'Log Compliance',
    sub: 'Capture an evidence photo for a new log',
  },
};

export default function Header({ tab }: { tab: string }) {
  const { title, sub } = TITLES[tab] ?? TITLES.dashboard;
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  return (
    <header className="bg-[#0a0f1d]/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 px-4 sm:px-8 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-lg font-bold text-white">{title}</h1>
        <p className="text-xs text-slate-500">{sub}</p>
      </div>
      <p className="text-xs text-slate-500 hidden sm:block">{today}</p>
    </header>
  );
}
