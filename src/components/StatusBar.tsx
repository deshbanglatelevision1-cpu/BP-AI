import React, { useState, useEffect } from 'react';
import { Wifi, Battery, Signal } from 'lucide-react';

interface StatusBarProps {
  isSimpleMode?: boolean;
}

export default function StatusBar({ isSimpleMode }: StatusBarProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={`fixed top-0 left-0 right-0 h-8 backdrop-blur-md z-[60] flex items-center justify-between px-6 border-b transition-colors ${isSimpleMode ? 'bg-white/80 border-gray-100' : 'bg-black/40 border-white/5'}`}>
      <div className="flex items-center gap-4">
        <span className={`text-[10px] font-bold tracking-widest ${isSimpleMode ? 'text-gray-600' : 'text-white/80'}`}>
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
        <div className="flex items-center gap-2">
          <Signal size={12} className={isSimpleMode ? 'text-gray-400' : 'text-white/60'} />
          <Wifi size={12} className={isSimpleMode ? 'text-gray-400' : 'text-white/60'} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-[10px] font-bold tracking-widest ${isSimpleMode ? 'text-blue-600' : 'text-white/80'}`}>{isSimpleMode ? 'SIMPLE' : 'PREMIUM'}</span>
        <Battery size={14} className="text-emerald-500" />
      </div>
    </div>
  );
}
