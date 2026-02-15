
import React, { useState, useEffect } from 'react';

interface PreloaderProps {
  onComplete: () => void;
}

const Preloader: React.FC<PreloaderProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Simulate a high-tech boot sequence
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsExiting(true);
            setTimeout(onComplete, 800);
          }, 500);
          return 100;
        }
        // Jump progress for a "loading modules" feel
        const increment = Math.random() > 0.8 ? Math.random() * 15 : Math.random() * 3;
        return Math.min(prev + increment, 100);
      });
    }, 100);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-[1000] bg-slate-950 flex flex-col items-center justify-center transition-all duration-1000 ease-in-out ${
      isExiting ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
    }`}>
      {/* Deep Space Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,212,255,0.05)_0%,transparent_70%)]" />
        <div className="absolute inset-0">
          {[...Array(40)].map((_, i) => (
            <div 
              key={i} 
              className="absolute bg-white rounded-full"
              style={{
                width: Math.random() * 2 + 'px',
                height: Math.random() * 2 + 'px',
                top: Math.random() * 100 + '%',
                left: Math.random() * 100 + '%',
                opacity: Math.random() * 0.7 + 0.3,
                boxShadow: '0 0 4px #fff',
                animation: `pulse ${2 + Math.random() * 4}s infinite`
              }}
            />
          ))}
        </div>
      </div>

      <div className="relative flex flex-col items-center w-full max-w-lg select-none">
        {/* Wireframe Rocket Group */}
        <div className="relative mb-16 transform -rotate-12 animate-float">
          <svg className="w-64 h-80 drop-shadow-[0_0_15px_rgba(0,212,255,0.2)]" viewBox="0 0 200 250" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Rocket Body - Main Wireframe */}
            <path d="M100 20 L70 70 L70 180 L100 210 L130 180 L130 70 Z" stroke="#00D4FF" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M70 70 L100 90 L130 70" stroke="#00D4FF" strokeWidth="0.5" strokeOpacity="0.5" />
            <path d="M70 140 L130 140" stroke="#00D4FF" strokeWidth="0.5" strokeOpacity="0.3" />
            <path d="M70 180 L100 160 L130 180" stroke="#00D4FF" strokeWidth="0.5" strokeOpacity="0.5" />
            
            {/* Window Wireframe */}
            <circle cx="100" cy="85" r="18" stroke="#2ECC71" strokeWidth="1.5" />
            <circle cx="100" cy="85" r="14" stroke="#2ECC71" strokeWidth="0.5" strokeOpacity="0.4" />

            {/* Fins Wireframe */}
            <path d="M70 140 L40 200 L70 180 Z" stroke="#2ECC71" strokeWidth="1" />
            <path d="M130 140 L160 200 L130 180 Z" stroke="#2ECC71" strokeWidth="1" />
            
            {/* Tip Detail */}
            <path d="M100 20 L100 70" stroke="#00D4FF" strokeWidth="0.5" strokeDasharray="4 2" />
          </svg>

          {/* Central Percentage Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pt-10">
            <span className="text-6xl font-heading font-extrabold text-neon-cyan drop-shadow-[0_0_20px_rgba(0,212,255,0.8)] tracking-tight">
              {Math.round(progress)}%
            </span>
            
            {/* In-rocket Progress Bar */}
            <div className="w-32 h-1 bg-slate-900/80 rounded-full mt-4 border border-white/10 overflow-hidden">
              <div 
                className="h-full bg-neon-cyan transition-all duration-300 shadow-[0_0_10px_#00D4FF]"
                style={{ width: `${progress}%` }}
              />
            </div>
            
            <span className="text-[10px] font-heading font-bold uppercase tracking-[0.2em] text-slate-400 mt-3 animate-pulse">
              Загрузка систем..
            </span>
          </div>

          {/* Engine Exhaust Particles (Triangles) */}
          <div className="absolute left-1/2 -bottom-12 -translate-x-1/2 flex flex-col items-center">
            {[...Array(12)].map((_, i) => (
              <div 
                key={i}
                className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[10px] border-t-neon-cyan absolute animate-flame opacity-0"
                style={{
                  animationDelay: `${i * 0.15}s`,
                  left: `${(Math.random() - 0.5) * 30}px`,
                  transform: `scale(${0.5 + Math.random()})`
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(-12deg); }
          50% { transform: translateY(-15px) rotate(-10deg); }
        }
        @keyframes flame {
          0% { transform: translateY(0) scale(1); opacity: 0.8; }
          100% { transform: translateY(60px) scale(0); opacity: 0; }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        .animate-flame {
          animation: flame 1.2s ease-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Preloader;
