'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Video, AlertCircle, Play, Square } from 'lucide-react';

export default function CameraWidget() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsStreaming(true);
    } catch (err: any) {
      setError(err.message || 'Requested device not found');
      setIsStreaming(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  };

  useEffect(() => {
    // Auto-start camera on load
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="bg-[#0a0f1d] border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Camera size={18} className="text-indigo-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">Eivanta Code Logging</h3>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5 ${
          isStreaming ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
        }`}>
          <span className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
          {isStreaming ? 'Live Feed' : 'Offline'}
        </span>
      </div>

      {/* Video Viewport */}
      <div className="relative w-full h-64 bg-slate-950 rounded-xl overflow-hidden border border-slate-800/80 flex items-center justify-center my-2">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="w-full h-full object-cover"
        />
        {!isStreaming && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-2">
            <Video size={32} className="animate-pulse" />
            <span className="text-xs">Initializing camera stream...</span>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-rose-400 gap-2 p-4 text-center bg-slate-950/90">
            <AlertCircle size={28} />
            <span className="text-xs font-semibold">Console NotFoundError</span>
            <span className="text-[11px] text-slate-400">{error}</span>
          </div>
        )}
      </div>

      {/* Control Action Button */}
      <div className="mt-4">
        {isStreaming ? (
          <button 
            onClick={stopCamera}
            className="w-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold py-3 px-4 rounded-xl transition-colors shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2"
          >
            <Square size={16} /> Stop Logging Session
          </button>
        ) : (
          <button 
            onClick={startCamera}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-3 px-4 rounded-xl transition-colors shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
          >
            <Play size={16} /> Start Logging Session
          </button>
        )}
      </div>
    </div>
  );
}
