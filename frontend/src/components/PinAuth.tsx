'use client';
import { useState } from 'react';
import { useAuth } from '@/components/AuthContext';

export default function PinAuth() {
  const { login } = useAuth();
  const [operatorCode, setOperatorCode] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleKeyPress = (num: string) => {
    if (busy || pin.length >= 12) return;
    const next = pin + num;
    setPin(next);
    setError(null);
    // Auto-submit once a plausible PIN length is reached.
    if (next.length >= 4) void verifyPin(next);
  };

  const verifyPin = async (currentPin: string) => {
    if (!operatorCode.trim()) {
      setError('Enter your operator code first.');
      setPin('');
      return;
    }
    setBusy(true);
    try {
      await login(operatorCode, currentPin);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
      setTimeout(() => setPin(''), 1200);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 font-sans p-4">
      <div className="w-full max-w-md bg-slate-800 rounded-2xl shadow-2xl overflow-hidden border-2 border-slate-700">

        <div className="bg-slate-950 p-8 border-b border-slate-700 text-center">
          <h1 className="text-3xl font-black text-slate-100 uppercase tracking-widest">
            Operator Login
          </h1>
          <p className="text-slate-400 mt-2 text-lg">Eivanta Code Logging System</p>
        </div>

        <div className="p-8 bg-slate-900 flex flex-col items-center">
          <input
            value={operatorCode}
            onChange={(e) => setOperatorCode(e.target.value.toUpperCase())}
            placeholder="Operator code (e.g. OP-4099)"
            autoComplete="off"
            className="w-full mb-6 px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white text-center text-xl tracking-widest placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />

          {/* PIN Indicators */}
          <div className="flex gap-4 mb-8">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={`w-6 h-6 rounded-full border-4 transition-colors ${
                  error ? 'bg-red-500 border-red-500' :
                  i < Math.min(pin.length, 6) ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' :
                  'bg-transparent border-slate-600'
                }`}
              />
            ))}
          </div>

          {error && <p className="mb-4 text-red-400 text-sm">{error}</p>}

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-4 w-full">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handleKeyPress(num.toString())}
                disabled={busy}
                className="py-6 text-3xl font-bold text-white bg-slate-700 rounded-xl hover:bg-slate-600 active:bg-slate-500 transition-colors disabled:opacity-50"
              >
                {num}
              </button>
            ))}
            <button
              onClick={() => setPin('')}
              disabled={busy}
              className="py-6 text-xl font-bold text-slate-400 bg-slate-800 rounded-xl hover:text-white transition-colors disabled:opacity-50"
            >
              CLEAR
            </button>
            <button
              onClick={() => handleKeyPress('0')}
              disabled={busy}
              className="py-6 text-3xl font-bold text-white bg-slate-700 rounded-xl hover:bg-slate-600 active:bg-slate-500 transition-colors disabled:opacity-50"
            >
              0
            </button>
            <button
              onClick={() => setPin(pin.slice(0, -1))}
              disabled={busy}
              className="py-6 text-xl font-bold text-slate-400 bg-slate-800 rounded-xl hover:text-white transition-colors disabled:opacity-50"
            >
              DEL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
