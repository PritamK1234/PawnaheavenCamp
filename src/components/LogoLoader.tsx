import React from 'react';

const LogoLoader = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black">
      <div className="relative">
        {/* Animated Glow Rings */}
        <div className="absolute inset-0 -m-8 rounded-full border border-primary/20 animate-ping duration-1000" />
        <div className="absolute inset-0 -m-12 rounded-full border border-primary/10 animate-ping duration-1500" />
        
        {/* Logo Container */}
        <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full flex items-center justify-center overflow-hidden bg-gradient-to-b from-[#1a1a1a] to-[#0d0d0d] shadow-[0_0_50px_rgba(212,175,55,0.3)] border-2 border-primary/50 group">
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent animate-shimmer-3d pointer-events-none" />
          <img 
            src="/assets/logo_lite.png" 
            alt="Pawna Haven Camp" 
            className="w-24 h-24 md:w-32 md:h-32 object-contain animate-pulse"
            onError={(e) => {
              console.error("Logo failed to load in loader");
              // Fallback to the other known logo if this one fails
              (e.target as HTMLImageElement).src = "/assets/logo.png";
            }}
          />
        </div>
      </div>
      
      {/* Loading Text */}
      <div className="mt-12 text-center">
        <h2 className="font-display text-2xl font-bold tracking-[0.2em] bg-gradient-to-r from-primary via-gold-light to-primary bg-clip-text text-transparent animate-shimmer">
          PAWNA HAVEN
        </h2>
        <div className="mt-2 h-0.5 w-48 bg-secondary/30 rounded-full overflow-hidden mx-auto">
          <div className="h-full bg-primary animate-progress-glow w-full origin-left" />
        </div>
      </div>
    </div>
  );
};

export default LogoLoader;
