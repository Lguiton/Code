'use client';
import { useRef, useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';
import { uploadComplianceLog } from '@/lib/api';

const LOG_TYPES = ['GREASE_TRAP', 'ORGANIC_WASTE'] as const;

export default function CameraCapture() {
  const { auth, logout } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logType, setLogType] = useState<string>(LOG_TYPES[0]);
  const [notice, setNotice] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    setStream((prev) => {
      prev?.getTracks().forEach((track) => track.stop());
      return null;
    });
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
    } catch {
      setNotice('Camera unavailable — check browser permissions.');
    }
  };

  useEffect(() => () => stopCamera(), [stopCamera]);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context?.drawImage(videoRef.current, 0, 0);
      setImageSrc(canvasRef.current.toDataURL('image/jpeg', 0.8));
      stopCamera();
    }
  }, [stopCamera]);

  const submitLog = async () => {
    if (!imageSrc || !auth) return;
    setIsSubmitting(true);
    setNotice(null);
    try {
      // Convert the data URL back to a Blob for multipart transport.
      const blob = await (await fetch(imageSrc)).blob();
      const result = await uploadComplianceLog(auth.token, logType, blob);
      setNotice(`Log archived (${result.ai_status}).`);
      setImageSrc(null);
      await startCamera(); // Reset for the next log.
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Submission failed.';
      setNotice(message);
      // Expired/invalid session: force a fresh login.
      if (message.includes('Session expired')) logout();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center p-4 font-sans">
      <div className="w-full max-w-3xl bg-slate-800 rounded-xl shadow-2xl overflow-hidden border-2 border-slate-700">
        <div className="bg-slate-950 p-6 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-slate-100 text-center uppercase tracking-widest">
            Eivanta Code Logging
          </h2>
          <p className="text-center text-slate-400 mt-1 text-sm">
            Logged in as <span className="text-emerald-400 font-semibold">{auth?.operatorCode}</span>
          </p>
        </div>

        <div className="px-6 pt-4 flex gap-2 justify-center">
          {LOG_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setLogType(t)}
              className={`px-4 py-2 rounded-lg text-sm font-bold tracking-wide ${
                logType === t ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {t.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="relative aspect-video bg-black flex items-center justify-center m-4 rounded-lg overflow-hidden">
          {!imageSrc && <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />}
          {imageSrc && <img src={imageSrc} alt="Captured asset" className="w-full h-full object-cover" />}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {notice && <p className="text-center text-slate-300 text-sm px-6 pb-2">{notice}</p>}

        <div className="p-8 pt-2 flex justify-center bg-slate-900">
          {!stream && !imageSrc && (
            <button onClick={startCamera} className="w-full max-w-sm px-8 py-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xl shadow-lg">
              Start Logging Session
            </button>
          )}
          {stream && (
            <button onClick={capturePhoto} className="px-16 py-8 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-full shadow-[0_0_20px_rgba(37,99,235,0.5)] border-4 border-slate-950 active:scale-95 text-2xl">
              CAPTURE
            </button>
          )}
          {imageSrc && (
            <div className="flex gap-6 w-full max-w-2xl">
              <button onClick={() => { setImageSrc(null); void startCamera(); }} disabled={isSubmitting} className="flex-1 px-6 py-6 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg text-xl disabled:opacity-50">
                Retake
              </button>
              <button onClick={() => void submitLog()} disabled={isSubmitting} className="flex-1 px-6 py-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xl shadow-lg flex justify-center items-center disabled:opacity-50">
                {isSubmitting ? 'Verifying AI...' : 'Submit Log'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
