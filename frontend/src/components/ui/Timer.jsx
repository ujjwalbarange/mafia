/**
 * Timer — countdown timer with circular progress ring
 * Uses server time offset for synchronized countdown across all devices
 */
import { useState, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';

export default function Timer({ deadline, onExpire, label = 'Time Left' }) {
  const { getServerNow } = useSocket();
  const [remaining, setRemaining] = useState(0);
  const [total, setTotal] = useState(0);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!deadline) return;
    setExpired(false);

    // Use server-synced time for initial calculation
    const now = getServerNow();
    const totalMs = deadline - now;
    setTotal(Math.max(totalMs / 1000, 1));
    setRemaining(Math.max(totalMs / 1000, 0));

    const interval = setInterval(() => {
      const serverNow = getServerNow();
      const left = Math.max((deadline - serverNow) / 1000, 0);
      setRemaining(left);
      if (left <= 0 && !expired) {
        setExpired(true);
        clearInterval(interval);
        onExpire?.();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [deadline, getServerNow]);

  const minutes = Math.floor(remaining / 60);
  const seconds = Math.floor(remaining % 60);
  const progress = total > 0 ? remaining / total : 0;
  const circumference = 2 * Math.PI * 45;
  const offset = circumference * (1 - progress);
  const isLow = remaining <= 10;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          {/* Background ring */}
          <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
          {/* Progress ring */}
          <circle
            cx="50" cy="50" r="45" fill="none"
            stroke={isLow ? 'var(--color-neon-red)' : 'var(--color-neon-purple)'}
            strokeWidth="4" strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.1s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-display text-2xl font-bold ${isLow ? 'text-neon-red text-glow-red' : 'text-text-primary'}`}>
            {minutes}:{seconds.toString().padStart(2, '0')}
          </span>
        </div>
      </div>
      <span className="text-xs text-text-muted uppercase tracking-wider">{label}</span>
    </div>
  );
}
