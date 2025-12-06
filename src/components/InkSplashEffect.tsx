import React, { useEffect, useState } from 'react';

interface InkSplashEffectProps {
  isActive: boolean;
  x: number;
  y: number;
  onComplete: () => void;
}

interface InkSplashEffectProps {
  isActive: boolean;
  x: number;
  y: number;
  onComplete: () => void;
  reverse?: boolean;
}

export const InkSplashEffect = ({ isActive, x, y, onComplete, reverse = false }: InkSplashEffectProps) => {
  const [mounted, setMounted] = useState(false);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (isActive) {
      setMounted(true);
      if (reverse) {
        // For reverse animation, start expanded and shrink
        setAnimate(false);
        requestAnimationFrame(() => setAnimate(true));
      } else {
        // For normal animation, start small and expand
        requestAnimationFrame(() => setAnimate(true));
      }
      const timer = setTimeout(() => {
        onComplete();
        setMounted(false);
        setAnimate(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isActive, onComplete, reverse]);

  if ( !mounted) return null;

  return (
    <div 
      className="fixed inset-0 pointer-events-none z-50 overflow-hidden"
      
    >
      <div
        className={`absolute rounded-full 
        
        transition-transform duration-1000 ease-out
        bg-white
        `}
        style={{
          left: x,
          top: y,
          width: '20px',
          height: '20px',
          transform: reverse
            ? (animate 
                ? 'translate(-50%, -50%) scale(0)' // Thu gọn lại
                : 'translate(-50%, -50%) scale(150)') // Bắt đầu từ full màn hình, to hơn
            : (animate 
                ? 'translate(-50%, -50%) scale(150)' // Bung ra hết màn hình, to hơn để phủ kín
                : 'translate(-50%, -50%) scale(0)'), // Bắt đầu từ điểm nhỏ
        }}
      />
    </div>
  );
};
