import React from 'react';

const PageSkeleton = () => {
  return (
    <div className="fixed inset-0 z-[9999] bg-background">
      <div className="absolute top-0 left-0 right-0 h-[3px] overflow-hidden">
        <div
          className="h-full bg-primary"
          style={{
            animation: 'page-skeleton-progress 0.8s ease-in-out infinite',
          }}
        />
      </div>
      <style>{`
        @keyframes page-skeleton-progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default PageSkeleton;
