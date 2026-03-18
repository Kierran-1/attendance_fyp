'use client';

import { useEffect, useState } from 'react';

export default function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Start fade out after 1.8s
    const fadeTimer = setTimeout(() => setFadeOut(true), 1800);
    // Remove from DOM after fade completes
    const removeTimer = setTimeout(() => setVisible(false), 2300);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-[#0f0f0f] flex flex-col items-center justify-center transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Glow blobs */}
      <div
        className="absolute -top-20 -left-20 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(228,0,43,0.15) 0%, transparent 65%)' }}
      />
      <div
        className="absolute -bottom-20 -right-20 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(228,0,43,0.08) 0%, transparent 65%)' }}
      />

      {/* Static grid */}
      <div className="absolute inset-0 auth-grid pointer-events-none" />

      {/* Logo */}
      <div className="relative z-10 flex flex-col items-center gap-5 splash-animate">
        <div
          className="w-20 h-20 bg-[#E4002B] rounded-2xl flex items-center justify-center text-white font-black text-3xl"
          style={{ boxShadow: '0 0 60px rgba(228,0,43,0.5)' }}
        >
          AS
        </div>

        <div className="text-center">
          <div className="text-white text-3xl font-black tracking-tight">
            Attend<span className="text-[#E4002B]">Sync</span>
          </div>
          <div className="text-white/40 text-sm mt-1 font-medium">
            Swinburne University of Technology Sarawak
          </div>
        </div>

        {/* Loading dots */}
        <div className="flex gap-1.5 mt-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-[#E4002B] loading-dot"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
