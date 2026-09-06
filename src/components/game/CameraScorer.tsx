import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AutoscoringEngine, EngineState } from '../../lib/cv/engine';
import { getCalibrationMatrix } from '../../lib/cv/calibration';
import { PixelCoords } from '../../lib/cv/geometry';
import { DartThrow, throwLabel } from '../../core/types';

interface CameraScorerProps {
  onDartDetected: (dartThrow: DartThrow) => void;
}

export const CameraScorer: React.FC<CameraScorerProps> = ({ onDartDetected }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [engine, setEngine] = useState<AutoscoringEngine | null>(null);
  const [engineState, setEngineState] = useState<EngineState>(EngineState.UNINITIALIZED);
  
  const [calibrationPoints, setCalibrationPoints] = useState<PixelCoords[]>([]);
  const [lastThrow, setLastThrow] = useState<DartThrow | null>(null);

  // Initialize engine
  useEffect(() => {
    // Wait until OpenCV is loaded globally from index.html script tag
    const checkOpenCV = setInterval(() => {
      // @ts-ignore
      if (typeof cv !== 'undefined') {
        clearInterval(checkOpenCV);
        
        const newEngine = new AutoscoringEngine({
          onStateChange: setEngineState,
          onDartDetected: (throwData) => {
            setLastThrow(throwData);
            onDartDetected(throwData);
          }
        });
        setEngine(newEngine);
      }
    }, 500);

    return () => clearInterval(checkOpenCV);
  }, [onDartDetected]);

  // Request camera permissions and start stream
  useEffect(() => {
    if (!videoRef.current) return;
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Camera access requires a secure connection (HTTPS) or localhost. Apple blocks camera access on local IP addresses (like 192.168.x.x) without HTTPS.");
      return;
    }
    
    navigator.mediaDevices.getUserMedia({ 
      // facingMode: environment enforces the back camera on iPhones
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
    }).then(stream => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    }).catch(err => {
      console.error("Failed to access camera", err);
      alert("Failed to access camera. Please ensure you have granted permissions.");
    });

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Hook engine up to video element
  useEffect(() => {
    if (engine && videoRef.current) {
      videoRef.current.onloadedmetadata = () => {
        engine.setVideoSource(videoRef.current!);
        engine.start();
        
        // Match overlay canvas size to video
        if (canvasRef.current) {
          canvasRef.current.width = videoRef.current!.videoWidth;
          canvasRef.current.height = videoRef.current!.videoHeight;
        }
      };
    }

    return () => {
      if (engine) engine.stop();
    };
  }, [engine]);

  // Handle canvas clicks for calibration
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (engineState !== EngineState.CALIBRATING || !canvasRef.current || !videoRef.current) return;
    
    // Convert click coordinates to canvas coordinates (considering CSS scaling)
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    const newPoints = [...calibrationPoints, { x, y }];
    setCalibrationPoints(newPoints);

    // Draw point for visual feedback
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#10b981'; // Emerald 500
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (newPoints.length === 4) {
      try {
        const hMatrix = getCalibrationMatrix(newPoints, 1000);
        engine?.setCalibration(hMatrix);
        setCalibrationPoints([]); 
        
        if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      } catch (err) {
        console.error("Calibration failed", err);
        setCalibrationPoints([]);
        if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  }, [engine, engineState, calibrationPoints]);

  return (
    <div className="relative w-full max-w-2xl mx-auto rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 shadow-2xl">
      <div className="absolute top-4 left-4 z-10 bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-700 text-slate-200 text-sm font-medium">
        State: <span className="text-emerald-400">{engineState}</span>
      </div>
      
      {lastThrow && (
        <div className="absolute top-4 right-4 z-10 bg-emerald-500/90 backdrop-blur text-white font-bold px-4 py-2 rounded-lg shadow-lg border border-emerald-400/50 animate-bounce">
          🎯 {throwLabel(lastThrow)}
        </div>
      )}

      {engineState === EngineState.CALIBRATING && (
        <div className="absolute bottom-6 left-6 right-6 z-10 bg-slate-900/90 backdrop-blur p-4 rounded-xl border border-slate-700 shadow-xl text-center text-slate-200 font-medium">
          Tap the 4 outer edges of the double ring
          <div className="text-sm text-slate-400 mt-1">Clockwise, starting from Top (20)</div>
          <div className="mt-3 flex justify-center gap-2">
            {[0,1,2,3].map(i => (
              <div key={i} className={`h-2 w-8 rounded-full ${i < calibrationPoints.length ? 'bg-emerald-500' : 'bg-slate-700'}`} />
            ))}
          </div>
        </div>
      )}
      
      {engineState === EngineState.WAITING_REMOVAL && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center z-10">
          <button 
            onClick={() => {
              setLastThrow(null);
              engine?.resetToIdle();
            }}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold shadow-xl transition-transform active:scale-95 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Darts Removed
          </button>
        </div>
      )}

      {/* Video Stream */}
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className="w-full h-auto object-cover aspect-video" 
      />
      
      {/* Overlay Canvas for clicks and debug drawing */}
      <canvas 
        ref={canvasRef} 
        onClick={handleCanvasClick}
        className="absolute top-0 left-0 w-full h-full cursor-crosshair touch-none"
      />
    </div>
  );
};
