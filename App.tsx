
import React, { useState, useEffect, useRef } from 'react';
import { GameStatus, HandData } from './types';
import { HandTracker } from './services/handTracker';
import GameCanvas from './components/GameCanvas';

const GAME_DURATION = 45;

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.IDLE);
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(100);
  const [highScore, setHighScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [sensitivity, setSensitivity] = useState(0.05);
  const [handData, setHandData] = useState<HandData>({
    cursor: { x: 0.5, y: 0.5 },
    isFiring: false,
    handDetected: false,
    pinchDistance: 1.0
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const trackerRef = useRef<HandTracker | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('gesture_gunner_highscore');
    if (saved) setHighScore(parseInt(saved));
  }, []);

  const initTracker = async () => {
    if (!videoRef.current) return;
    setStatus(GameStatus.LOADING);
    try {
      trackerRef.current = new HandTracker(videoRef.current, (data) => {
        setHandData(data);
      });
      await trackerRef.current.start();
      setStatus(GameStatus.IDLE);
    } catch (err) {
      console.error("Camera access failed", err);
      alert("Please grant camera access to play!");
      setStatus(GameStatus.IDLE);
    }
  };

  const startGame = () => {
    setScore(0);
    setHealth(100);
    setTimeLeft(GAME_DURATION);
    setStatus(GameStatus.PLAYING);
    if (trackerRef.current) trackerRef.current.pinchThreshold = sensitivity;
    
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const endGame = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setStatus(GameStatus.GAME_OVER);
    setHighScore(current => {
      const news = score > current ? score : current;
      localStorage.setItem('gesture_gunner_highscore', news.toString());
      return news;
    });
  };

  const handleHealthUpdate = (delta: number) => {
    setHealth(prev => {
      const next = prev + delta;
      if (next <= 0) {
        endGame();
        return 0;
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-950 font-['Orbitron']">
      <div className="mb-6 text-center">
        <h1 className="text-5xl font-black tracking-tighter italic text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-rose-500 mb-2 drop-shadow-[0_0_15px_rgba(244,63,94,0.3)]">
          GESTURE GUNNER
        </h1>
        <div className="flex justify-center gap-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
          <span>NEON STRIKE v1.1</span>
          <span>•</span>
          <span className="text-cyan-500">HI-SCORE: {highScore}</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 w-full max-w-7xl items-stretch">
        <div className="flex-grow aspect-[10/7] relative">
          <GameCanvas 
            handData={handData} 
            status={status} 
            score={score}
            health={health}
            onScoreUpdate={(p) => setScore(s => s + p)}
            onHealthUpdate={handleHealthUpdate}
            gameTime={timeLeft}
          />
          
          {(status === GameStatus.IDLE || status === GameStatus.GAME_OVER || status === GameStatus.LOADING) && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center text-center p-8 z-20">
              {status === GameStatus.LOADING ? (
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                  <p className="text-2xl font-bold animate-pulse text-cyan-400">CONNECTING TO NEURAL LINK...</p>
                </div>
              ) : status === GameStatus.IDLE ? (
                <>
                  <div className="mb-10 space-y-6 max-w-2xl">
                    <h2 className="text-4xl font-black text-white">SYSTEM ONLINE</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-700">
                        <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center mb-3 text-cyan-400">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        </div>
                        <p className="text-cyan-400 font-bold text-lg mb-1">TARGETING</p>
                        <p className="text-xs text-slate-400 leading-relaxed uppercase tracking-tight">Hand position determines crosshair coordinates. Smoothing enabled for precision.</p>
                      </div>
                      <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-700">
                         <div className="w-10 h-10 bg-rose-500/20 rounded-lg flex items-center justify-center mb-3 text-rose-400">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                        </div>
                        <p className="text-rose-400 font-bold text-lg mb-1">PULSE FIRE</p>
                        <p className="text-xs text-slate-400 leading-relaxed uppercase tracking-tight">Pinch thumb and index together to fire plasma bolts. Avoid red hazard cores.</p>
                      </div>
                    </div>
                    
                    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-xs font-bold text-slate-500">PINCH SENSITIVITY</span>
                        <span className="text-cyan-400 font-bold">{Math.round((1 - sensitivity) * 100)}%</span>
                      </div>
                      <input 
                        type="range" min="0.01" max="0.15" step="0.01" 
                        value={sensitivity}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setSensitivity(val);
                          if (trackerRef.current) trackerRef.current.pinchThreshold = val;
                        }}
                        className="w-full accent-cyan-500 bg-slate-800 rounded-lg appearance-none h-2 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-600 mt-2 font-bold uppercase tracking-widest">
                        <span>Sensitive</span>
                        <span>Deliberate</span>
                      </div>
                    </div>
                  </div>
                  {trackerRef.current ? (
                    <button 
                      onClick={startGame}
                      className="group relative px-12 py-5 overflow-hidden rounded-full transition-all hover:scale-105 active:scale-95"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-600 group-hover:from-cyan-500 group-hover:to-blue-500 animate-pulse"></div>
                      <span className="relative text-2xl font-black text-white uppercase tracking-widest italic">Initialize Combat</span>
                    </button>
                  ) : (
                    <button 
                      onClick={initTracker}
                      className="px-12 py-5 bg-white text-slate-950 rounded-full text-2xl font-black uppercase tracking-widest transition-all hover:bg-slate-200"
                    >
                      Boot Sensors
                    </button>
                  )}
                </>
              ) : (
                <>
                  <h2 className="text-7xl font-black text-rose-500 mb-2 italic drop-shadow-[0_0_20px_rgba(244,63,94,0.5)]">SESSION OVER</h2>
                  <div className="flex flex-col gap-2 mb-10">
                    <p className="text-2xl text-slate-400 font-bold">SCORE: <span className="text-white">{score}</span></p>
                    {score >= highScore && score > 0 && <p className="text-emerald-400 font-black animate-bounce">NEW SECTOR RECORD!</p>}
                  </div>
                  <button 
                    onClick={startGame}
                    className="px-12 py-5 bg-cyan-500 text-slate-950 rounded-full text-2xl font-black uppercase tracking-widest shadow-[0_0_40px_rgba(6,182,212,0.4)] hover:bg-cyan-400 transition-all"
                  >
                    Re-Engage
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="lg:w-80 flex flex-col gap-4">
          <div className="relative aspect-video lg:aspect-square bg-slate-900 rounded-xl border-2 border-slate-800 overflow-hidden">
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover scale-x-[-1]" playsInline muted />
            <div className={`absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold ${handData.handDetected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
              <div className={`w-2 h-2 rounded-full ${handData.handDetected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></div>
              {handData.handDetected ? 'NEURAL LINK ACTIVE' : 'SEARCHING FOR BIOMETRICS'}
            </div>
          </div>

          <div className="flex-grow bg-slate-900/50 border-2 border-slate-800 rounded-xl p-5 space-y-6">
            <div>
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Pinch Calibration</h3>
              <div className="w-full bg-slate-800 h-4 rounded-full overflow-hidden p-1">
                <div 
                  className={`h-full rounded-full transition-all duration-75 ${handData.isFiring ? 'bg-rose-500' : 'bg-cyan-500'}`}
                  style={{ width: `${Math.min(100, (handData.pinchDistance / sensitivity) * 50)}%` }}
                />
              </div>
              <div className="flex justify-between text-[8px] text-slate-600 mt-2 font-bold uppercase tracking-widest">
                <span>OPEN</span>
                <span className={handData.isFiring ? 'text-rose-400' : ''}>{handData.isFiring ? 'FIRING' : 'IDLE'}</span>
                <span>TARGET</span>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Target Intel</h3>
              <div className="flex items-center justify-between p-2 bg-slate-900 rounded-lg border border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
                  <span className="text-xs text-slate-300">SCOUT</span>
                </div>
                <span className="text-xs font-bold text-cyan-500">+10</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-900 rounded-lg border border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                  <span className="text-xs text-slate-300">ELITE</span>
                </div>
                <span className="text-xs font-bold text-amber-400">+50</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-900 rounded-lg border border-rose-900/30">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                  <span className="text-xs text-slate-300">HAZARD</span>
                </div>
                <span className="text-xs font-bold text-rose-500">-20 HP</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-8 flex gap-4 text-[9px] text-slate-700 font-bold uppercase tracking-[0.3em]">
        <span>ENCRYPTED_MOTION_LINK</span>
        <span>•</span>
        <span>NO_INPUT_REQUIRED</span>
      </footer>
    </div>
  );
};

export default App;
