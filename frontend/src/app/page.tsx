'use client';
import { useState } from 'react';
import PinAuth from '@/components/PinAuth';
import CameraCapture from '@/components/CameraCapture';
import { AuthProvider, useAuth } from '@/components/AuthContext';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import TopMetrics from '../../components/TopMetrics';
import SecondaryMetrics from '../../components/SecondaryMetrics';
import LatestProjects from '../../components/LatestProjects';

function Shell() {
  const { auth, logout } = useAuth();
  const [tab, setTab] = useState<'dashboard' | 'log'>('dashboard');

  if (!auth) {
    return <PinAuth />;
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100">
      <Sidebar />
      <div className="md:ml-64 min-h-screen flex flex-col">
        <Header />
        <div className="px-4 sm:px-6 pt-4 flex gap-2">
          {(['dashboard', 'log'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider ${
                tab === t ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {t === 'dashboard' ? 'Dashboard' : 'Log Compliance'}
            </button>
          ))}
        </div>
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          {tab === 'dashboard' ? (
            <>
              <TopMetrics />
              <SecondaryMetrics />
              <LatestProjects />
            </>
          ) : (
            <CameraCapture />
          )}
        </main>
      </div>
      <button
        onClick={logout}
        className="fixed bottom-4 right-4 px-4 py-2 bg-slate-800 text-slate-400 rounded-lg text-sm hover:text-white"
      >
        Lock Terminal ({auth.operatorCode})
      </button>
    </div>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
