'use client';
import { useState } from 'react';
import PinAuth from '@/components/PinAuth';
import CameraCapture from '@/components/CameraCapture';
import ComplianceDashboard from '@/components/ComplianceDashboard';
import ReviewQueue from '@/components/ReviewQueue';
import ReportsTab from '@/components/ReportsTab';
import { AuthProvider, useAuth } from '@/components/AuthContext';
import Sidebar, { type AppTab } from '../../components/Sidebar';
import Header from '../../components/Header';

function Shell() {
  const { auth, logout } = useAuth();
  const [tab, setTab] = useState<AppTab>('dashboard');

  if (!auth) {
    return <PinAuth />;
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100">
      <Sidebar
        tab={tab}
        onTab={setTab}
        operatorCode={auth.operatorCode}
        onLogout={logout}
      />
      <div className="md:ml-64 min-h-screen flex flex-col">
        <Header tab={tab} />
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          {tab === 'dashboard' && <ComplianceDashboard token={auth.token} />}
          {tab === 'review' && <ReviewQueue token={auth.token} />}
          {tab === 'reports' && <ReportsTab token={auth.token} />}
          {tab === 'log' && <CameraCapture />}
        </main>
      </div>
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
