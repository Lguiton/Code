'use client';
import { useState } from 'react';
import PinAuth from '@/components/PinAuth';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import TopMetrics from '../../components/TopMetrics';
import SecondaryMetrics from '../../components/SecondaryMetrics';
import LatestProjects from '../../components/LatestProjects';

export default function Home() {
const [operatorId, setOperatorId] = useState<string | null>(null);

if (!operatorId) {
return <PinAuth onAuthenticated={(id) => setOperatorId(id)} />;
}

return (
<div className="min-h-screen bg-[#070b14] text-slate-100">
  <Sidebar />
  <div className="md:ml-64 min-h-screen flex flex-col">
    <Header />
    <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
      <TopMetrics />
      <SecondaryMetrics />
      <LatestProjects />
    </main>
  </div>
  <button
    onClick={() => setOperatorId(null)}
    className="fixed bottom-4 right-4 px-4 py-2 bg-slate-800 text-slate-400 rounded-lg text-sm hover:text-white"
  >
    Lock Terminal
  </button>
</div>
);
}
