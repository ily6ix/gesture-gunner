
import React, { useRef, useEffect } from 'react';
import { Target, GameStatus, HandData } from '../types';
import { soundManager } from '../services/soundService';

interface GameCanvasProps {
  handData: HandData;
  status: GameStatus;
  onScoreUpdate: (points: number) => void;
  onHealthUpdate: (delta: number) => void;
  gameTime: number;
  score: number;
  health: number;
}

const TARGET_COLORS = ['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6'];
const SPAWN_INTERVAL = 800;

const GameCanvas: React.FC<GameCanvasProps> = ({ handData, status, onScoreUpdate, onHealthUpdate, gameTime, score, health }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const targetsRef = useRef<Target[]>([]);
  const lastSpawnTime = useRef(0);
  const lastFireRef = useRef(false);
  const explosionRef = useRef<{x: number, y: number, life: number, color: string}[]>([]);
  const shakeRef = useRef(0);

  useEffect(() => {
    if (status !== GameStatus.PLAYING) return;
    
    targetsRef.current = [];
    explosionRef.current = [];
    shakeRef.current = 0;
    let animationFrameId: number;

    const spawnTarget = (time: number) => {
      if (time - lastSpawnTime.current > SPAWN_INTERVAL) {
        const typeRoll = Math.random();
        const type: Target['type'] = typeRoll > 0.9 ? 'bonus' : typeRoll < 0.15 ? 'hazard' : 'normal';
        
        // Speed scaling
        const speedMultiplier = 1 + (score / 1000);
        
        const newTarget: Target = {
          id: Math.random().toString(36).substr(2, 9),
          x: Math.random() * (canvasRef.current?.width || 800),
          y: Math.random() * (canvasRef.current?.height || 600),
          radius: type === 'bonus' ? 20 : type === 'hazard' ? 45 : 30,
          color: type === 'bonus' ? '#fbbf24' : type === 'hazard' ? '#ef4444' : TARGET_COLORS[Math.floor(Math.random() * TARGET_COLORS.length)],
          speedX: (Math.random() - 0.5) * 4 * speedMultiplier,
          speedY: (Math.random() - 0.5) * 4 * speedMultiplier,
          points: type === 'bonus' ? 50 : type === 'hazard' ? -20 : 10,
          type
        };
        targetsRef.current.push(newTarget);
        lastSpawnTime.current = time;
      }
    };

    const update = (time: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (handData.isFiring && !lastFireRef.current) {
        soundManager.playLaser();
        const aimX = handData.cursor.x * canvas.width;
        const aimY = handData.cursor.y * canvas.height;
        
        let hitSomething = false;
        targetsRef.current = targetsRef.current.filter(t => {
          const dx = t.x - aimX;
          const dy = t.y - aimY;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < t.radius + 15) {
            onScoreUpdate(t.points);
            hitSomething = true;
            if (t.type === 'hazard') {
              onHealthUpdate(-20);
              shakeRef.current = 15;
              soundManager.playDamage();
            } else {
              soundManager.playExplosion();
            }
            explosionRef.current.push({ x: t.x, y: t.y, life: 1, color: t.color });
            return false;
          }
          return true;
        });
      }
      lastFireRef.current = handData.isFiring;

      spawnTarget(time);
      targetsRef.current.forEach(t => {
        t.x += t.speedX; t.y += t.speedY;
        if (t.x < t.radius || t.x > canvas.width - t.radius) t.speedX *= -1;
        if (t.y < t.radius || t.y > canvas.height - t.radius) t.speedY *= -1;
      });

      ctx.save();
      if (shakeRef.current > 0) {
        ctx.translate((Math.random() - 0.5) * shakeRef.current, (Math.random() - 0.5) * shakeRef.current);
        shakeRef.current *= 0.9;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // BG Grid
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 50) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke(); }
      for (let i = 0; i < canvas.height; i += 50) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke(); }

      // Explosions
      explosionRef.current.forEach((exp, idx) => {
        ctx.beginPath();
        ctx.arc(exp.x, exp.y, (1 - exp.life) * 100, 0, Math.PI * 2);
        ctx.strokeStyle = exp.color;
        ctx.globalAlpha = exp.life;
        ctx.lineWidth = 4;
        ctx.stroke();
        exp.life -= 0.04;
        if (exp.life <= 0) explosionRef.current.splice(idx, 1);
      });
      ctx.globalAlpha = 1.0;

      // Targets
      targetsRef.current.forEach(t => {
        ctx.save();
        ctx.shadowBlur = 20;
        ctx.shadowColor = t.color;
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
        ctx.fillStyle = t.color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = t.type === 'bonus' ? 4 : 2;
        ctx.stroke();
        if (t.type === 'hazard') {
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 20px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText('!', t.x, t.y + 7);
        }
        ctx.restore();
      });

      // Crosshair
      const cx = handData.cursor.x * canvas.width;
      const cy = handData.cursor.y * canvas.height;
      const crossColor = handData.isFiring ? '#f43f5e' : (handData.handDetected ? '#22d3ee' : '#94a3b8');
      
      ctx.save();
      ctx.translate(cx, cy);
      ctx.strokeStyle = crossColor;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 10;
      ctx.shadowColor = crossColor;
      ctx.beginPath(); ctx.arc(0, 0, 25, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-35, 0); ctx.lineTo(-15, 0); ctx.moveTo(15, 0); ctx.lineTo(35, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -35); ctx.lineTo(0, -15); ctx.moveTo(0, 15); ctx.lineTo(0, 35); ctx.stroke();
      ctx.restore();

      ctx.restore();
      animationFrameId = requestAnimationFrame(update);
    };

    animationFrameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrameId);
  }, [status, handData.cursor, handData.isFiring, handData.handDetected, onScoreUpdate, score]);

  return (
    <div className="relative w-full h-full bg-slate-950 border-4 border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      <canvas ref={canvasRef} width={1000} height={700} className="w-full h-full" />
      {status === GameStatus.PLAYING && (
        <div className="absolute top-4 left-4 flex flex-col gap-3">
          <div className="flex gap-4">
            <div className="bg-slate-900/90 px-4 py-2 rounded border border-cyan-500 text-cyan-400 font-bold">
              SCORE: {score}
            </div>
            <div className="bg-slate-900/90 px-4 py-2 rounded border border-rose-500 text-rose-400 font-bold">
              TIME: {gameTime}s
            </div>
          </div>
          <div className="w-64 h-6 bg-slate-900/90 border border-emerald-500 rounded-full overflow-hidden p-1">
            <div 
              className="h-full bg-gradient-to-r from-emerald-600 to-cyan-400 transition-all duration-300 rounded-full" 
              style={{ width: `${health}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default GameCanvas;
