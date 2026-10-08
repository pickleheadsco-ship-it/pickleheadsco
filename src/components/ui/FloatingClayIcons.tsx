import React, { useState } from 'react';
import { firePickleballBurst } from '../../services/fx/pickleballBurst';

export interface FloatingClayItem {
  id: string;
  name: string;
  image: string;
  label?: string;
  isBrandIcon?: boolean;
  top: string;
  left?: string;
  right?: string;
  size: string;
  delay: string;
  duration: string;
  rotate: string;
}

const FLOATING_ITEMS: FloatingClayItem[] = [
  // 1. 3D Clay Pickleball — Upper right background
  {
    id: 'clay-ball-1',
    name: '3D Clay Pickleball',
    image: '/clay_pickleball.jpg',
    top: '10%',
    right: '2%',
    size: 'w-11 h-11 sm:w-16 sm:h-16 md:w-20 md:h-20',
    delay: '0.8s',
    duration: '4.6s',
    rotate: '8deg',
  },
  // 2. 3D Clay Paddle — Upper-mid right background
  {
    id: 'clay-paddle-1',
    name: '3D Clay Paddle',
    image: '/clay_paddle.jpg',
    top: '30%',
    right: '2%',
    size: 'w-12 h-12 sm:w-18 sm:h-18 md:w-22 md:h-22',
    delay: '1.4s',
    duration: '5.1s',
    rotate: '-10deg',
  },
  // 3. 3D Clay Whistle — Mid left background
  {
    id: 'clay-whistle-1',
    name: '3D Clay Whistle',
    image: '/clay_whistle.jpg',
    top: '36%',
    left: '2%',
    size: 'w-11 h-11 sm:w-16 sm:h-16 md:w-20 md:h-20',
    delay: '1.2s',
    duration: '4.4s',
    rotate: '-12deg',
  },
  // 4. 3D Clay Net — Lower right background
  {
    id: 'clay-net-1',
    name: '3D Clay Court Net',
    image: '/clay_net.jpg',
    top: '68%',
    right: '2%',
    size: 'w-12 h-12 sm:w-18 sm:h-18 md:w-22 md:h-22',
    delay: '1.8s',
    duration: '5.4s',
    rotate: '6deg',
  },
  // 5. 3D Clay Pickleball Mini — Lower left background
  {
    id: 'clay-ball-2',
    name: '3D Clay Pickleball Mini',
    image: '/clay_pickleball.jpg',
    top: '74%',
    left: '2%',
    size: 'w-10 h-10 sm:w-14 sm:h-14 md:w-18 md:h-18',
    delay: '2.6s',
    duration: '3.9s',
    rotate: '14deg',
  },
];

export const FloatingClayIcons: React.FC = () => {
  const [poppedId, setPoppedId] = useState<string | null>(null);

  const handleClick = (e: React.MouseEvent, item: FloatingClayItem) => {
    e.stopPropagation();
    firePickleballBurst(e.clientX, e.clientY);
    setPoppedId(item.id);
    setTimeout(() => setPoppedId(null), 450);
  };

  return (
    <aside 
      aria-label="Background floating 3D clay icons"
      className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none"
    >
      {FLOATING_ITEMS.map((item) => {
        const isPopping = poppedId === item.id;

        return (
          <div
            key={item.id}
            style={{
              top: item.top,
              left: item.left,
              right: item.right,
              animationDelay: item.delay,
              animationDuration: item.duration,
              transform: `rotate(${item.rotate})`,
            }}
            className={`absolute pointer-events-auto cursor-pointer animate-float transition-all select-none opacity-85 hover:opacity-100 max-sm:opacity-40 max-sm:scale-80 touch-manipulation ${
              isPopping ? 'scale-125 brightness-110 !opacity-100' : 'hover:scale-110 hover:-translate-y-1 active:scale-90'
            }`}
            onClick={(e) => handleClick(e, item)}
            title={`Click to burst pickleballs! (${item.name})`}
            aria-label={`${item.name} - click to burst pickleballs`}
          >
            {/* 3D Claymorphic Floating Capsule in Background */}
            <div
              className={`${item.size} rounded-3xl p-1.5 sm:p-2 clay-card shadow-xl flex items-center justify-center transform transition-all group bg-white/90 backdrop-blur-xs relative`}
              style={{
                boxShadow:
                  '6px 10px 20px rgba(148, 163, 184, 0.35), -5px -5px 12px rgba(255, 255, 255, 0.95), inset 2px 2px 4px rgba(255, 255, 255, 0.9), inset -2px -2px 5px rgba(203, 213, 225, 0.3)',
              }}
            >
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-full object-contain rounded-2xl drop-shadow-sm select-none pointer-events-none"
                referrerPolicy="no-referrer"
                draggable={false}
              />

              {/* Touch/hover active glow ring */}
              <span className="absolute -inset-1 rounded-3xl border-2 border-emerald-400/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>
          </div>
        );
      })}
    </aside>
  );
};
