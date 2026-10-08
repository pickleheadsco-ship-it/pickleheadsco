import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface WaitTimeTrackerProps {
  queueEnteredAt: any;
  showIcon?: boolean;
  className?: string;
}

export const WaitTimeTracker: React.FC<WaitTimeTrackerProps> = ({
  queueEnteredAt,
  showIcon = true,
  className = '',
}) => {
  const [minutes, setMinutes] = useState<number>(0);

  useEffect(() => {
    const calculateMinutes = () => {
      if (!queueEnteredAt) return 0;
      const startMs = queueEnteredAt.toMillis
        ? queueEnteredAt.toMillis()
        : new Date(queueEnteredAt).getTime();
      const diffMs = Math.max(0, Date.now() - startMs);
      return Math.floor(diffMs / (1000 * 60));
    };

    setMinutes(calculateMinutes());
    const interval = setInterval(() => {
      setMinutes(calculateMinutes());
    }, 15000); // refresh every 15s

    return () => clearInterval(interval);
  }, [queueEnteredAt]);

  const display = minutes === 0 ? '< 1m' : `${minutes}m`;

  return (
    <span className={`inline-flex items-center gap-1 text-xs text-slate-500 font-mono ${className}`}>
      {showIcon && <Clock className="w-3 h-3 text-slate-400" />}
      <span>{display}</span>
    </span>
  );
};

interface MatchTimerProps {
  startedAt: any;
  className?: string;
}

export const MatchTimer: React.FC<MatchTimerProps> = ({ startedAt, className = '' }) => {
  const [elapsed, setElapsed] = useState<string>('00:00');

  useEffect(() => {
    if (!startedAt) {
      setElapsed('00:00');
      return;
    }

    const startMs = startedAt.toMillis ? startedAt.toMillis() : new Date(startedAt).getTime();

    const updateTimer = () => {
      const totalSeconds = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      const hours = Math.floor(mins / 60);

      if (hours > 0) {
        const remMins = mins % 60;
        setElapsed(
          `${String(hours).padStart(2, '0')}:${String(remMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
        );
      } else {
        setElapsed(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <div className={`font-mono text-sm tracking-wider font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-flex items-center gap-1.5 ${className}`}>
      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      {elapsed}
    </div>
  );
};
