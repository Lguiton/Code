'use client';
import { useState } from 'react';

interface PinAuthProps {
onAuthenticated: (operatorId: string) => void;
}

export default function PinAuth({ onAuthenticated }: PinAuthProps) {
const [pin, setPin] = useState('');
const [error, setError] = useState(false);

const handleKeyPress = (num: string) => {
if (pin.length < 4) {
  const newPin = pin + num;
  setPin(newPin);
  setError(false);
  
  // Auto-submit when 4 digits are reached
  if (newPin.length === 4) {
    verifyPin(newPin);
  }
}
};

const verifyPin = (currentPin: string) => {
// In production, this verifies against the FastAPI backend
if (currentPin === '1234') {
  onAuthenticated('OP-4099'); // Return the mapped Operator ID
} else {
  setError(true);
  setTimeout(() => setPin(''), 1000); // Clear after error
}
};

return (
<div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 font-sans p-4">
  <div className="w-full max-w-md bg-slate-800 rounded-2xl shadow-2xl overflow-hidden border-2 border-slate-700">
    
    <div className="bg-slate-950 p-8 border-b border-slate-700 text-center">
      <h1 className="text-3xl font-black text-slate-100 uppercase tracking-widest">
        Enter Quick-PIN
      </h1>
      <p className="text-slate-400 mt-2 text-lg">Eivanta Code Logging System</p>
    </div>

    <div className="p-8 bg-slate-900 flex flex-col items-center">
      {/* PIN Indicators */}
      <div className="flex gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div 
            key={i} 
            className={`w-8 h-8 rounded-full border-4 transition-colors ${
              error ? 'bg-red-500 border-red-500' :
              i < pin.length ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 
              'bg-transparent border-slate-600'
            }`}
          />
        ))}
      </div>

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-4 w-full">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => handleKeyPress(num.toString())}
            className="py-6 text-3xl font-bold text-white bg-slate-700 rounded-xl hover:bg-slate-600 active:bg-slate-500 transition-colors"
          >
            {num}
          </button>
        ))}
        <button
          onClick={() => setPin('')}
          className="py-6 text-xl font-bold text-slate-400 bg-slate-800 rounded-xl hover:text-white transition-colors"
        >
          CLEAR
        </button>
        <button
          onClick={() => handleKeyPress('0')}
          className="py-6 text-3xl font-bold text-white bg-slate-700 rounded-xl hover:bg-slate-600 active:bg-slate-500 transition-colors"
        >
          0
        </button>
        <button
          onClick={() => setPin(pin.slice(0, -1))}
          className="py-6 text-xl font-bold text-slate-400 bg-slate-800 rounded-xl hover:text-white transition-colors"
        >
          DEL
        </button>
      </div>
    </div>
  </div>
</div>
);
}
