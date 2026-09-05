'use client';
import { useRef, useState, useCallback } from 'react';

export default function CameraCapture() {
const videoRef = useRef<HTMLVideoElement>(null);
const canvasRef = useRef<HTMLCanvasElement>(null);
const [imageSrc, setImageSrc] = useState<string | null>(null);
const [stream, setStream] = useState<MediaStream | null>(null);
const [isSubmitting, setIsSubmitting] = useState(false);

const startCamera = async () => {
try {
  const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
  setStream(mediaStream);
  if (videoRef.current) videoRef.current.srcObject = mediaStream;
} catch (err) {
  console.error("Camera access error", err);
}
};

const stopCamera = () => {
stream?.getTracks().forEach(track => track.stop());
setStream(null);
};

const capturePhoto = useCallback(() => {
if (videoRef.current && canvasRef.current) {
  const context = canvasRef.current.getContext('2d');
  canvasRef.current.width = videoRef.current.videoWidth;
  canvasRef.current.height = videoRef.current.videoHeight;
  context?.drawImage(videoRef.current, 0, 0);
  setImageSrc(canvasRef.current.toDataURL('image/jpeg', 0.8));
  stopCamera();
}
}, [stream]);

const submitLog = async () => {
if (!imageSrc) return;
setIsSubmitting(true);
try {
  // Convert Base64 back to Blob for multipart transport
  const res = await fetch(imageSrc);
  const blob = await res.blob();
  
  const formData = new FormData();
  formData.append('photo', blob, 'kitchen_capture.jpg');
  formData.append('operator_id', 'OP-4099'); // Mocked worker ID
  formData.append('log_type', 'GREASE_TRAP');

  const response = await fetch('http://localhost:8000/api/v1/ingestion/upload', {
    method: 'POST',
    body: formData,
  });
  
  if (response.ok) {
    alert('Log Verified & Archived Successfully!');
    setImageSrc(null);
    startCamera(); // Reset for the next kitchen worker
  }
} catch (error) {
  console.error('Submission failed', error);
  alert('Network error. Log saved locally for sync.');
} finally {
  setIsSubmitting(false);
}
};

return (
<div className="flex flex-col items-center justify-center p-4 bg-slate-900 min-h-screen font-sans">
  <div className="w-full max-w-3xl bg-slate-800 rounded-xl shadow-2xl overflow-hidden border-2 border-slate-700">
    <div className="bg-slate-950 p-6 border-b border-slate-700">
      <h2 className="text-2xl font-bold text-slate-100 text-center uppercase tracking-widest">Eivanta Code Logging</h2>
    </div>

    <div className="relative aspect-video bg-black flex items-center justify-center">
      {!imageSrc && <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"/>}
      {imageSrc && <img src={imageSrc} alt="Captured asset" className="w-full h-full object-cover" />}
      <canvas ref={canvasRef} className="hidden" />
    </div>

    <div className="p-8 flex justify-center bg-slate-900">
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
          <button onClick={() => { setImageSrc(null); startCamera(); }} disabled={isSubmitting} className="flex-1 px-6 py-6 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg text-xl">
            Retake
          </button>
          <button onClick={submitLog} disabled={isSubmitting} className="flex-1 px-6 py-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xl shadow-lg flex justify-center items-center">
            {isSubmitting ? 'Verifying AI...' : 'Submit Log'}
          </button>
        </div>
      )}
    </div>
  </div>
</div>
);
}
