import React from 'react';
import { GroupMatchProposal, Court, Participant } from '../../types';
import { SkillBadge } from '../ui/Badge';
import { WaitTimeTracker } from '../ui/WaitTimeTracker';
import { Users, Play, Volume2, PlusCircle, Sparkles } from 'lucide-react';

interface NextGroupCardProps {
  proposal: GroupMatchProposal | null;
  availableCourts: Court[];
  onStartOnCourt: (court: Court, proposal: GroupMatchProposal) => void;
  onAnnounceNextUp: (players: Participant[]) => void;
  onOpenManualBuilder: () => void;
}

export const NextGroupCard: React.FC<NextGroupCardProps> = ({
  proposal,
  availableCourts,
  onStartOnCourt,
  onAnnounceNextUp,
  onOpenManualBuilder,
}) => {
  if (!proposal) {
    return (
      <div className="clay-card rounded-3xl p-5 sm:p-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-slate-300" />
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Next Up</h3>
          </div>
          <button
            onClick={onOpenManualBuilder}
            className="text-xs text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1.5 py-1 px-2.5 rounded-xl clay-subcard"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Manual 4</span>
          </button>
        </div>
        <p className="text-xs text-slate-500 py-6 text-center font-medium">
          Waiting for at least 4 available players checked into the queue.
        </p>
      </div>
    );
  }

  const { players, teamA, teamB, reasoning, skillDelta } = proposal;
  const firstAvailableCourt = availableCourts[0];

  return (
    <div className="clay-card-dark text-white rounded-3xl p-5 sm:p-6 relative overflow-hidden">
      {/* Background soft glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
          <h3 className="font-black text-sm uppercase tracking-wider text-emerald-400">
            Next Up On Deck
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onAnnounceNextUp(players)}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors clay-btn border border-slate-700"
            title="Announce next up on speaker"
            aria-label="Announce next up"
          >
            <Volume2 className="w-4 h-4 text-emerald-400" />
          </button>
          <button
            onClick={onOpenManualBuilder}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors clay-btn border border-slate-700"
          >
            Custom 4
          </button>
        </div>
      </div>

      {/* Projected Teams Preview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10 mb-4">
        {/* Team A */}
        <div className="clay-inset-dark rounded-2xl p-3.5 border border-slate-800">
          <div className="text-[11px] font-black text-emerald-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Team A</span>
            <span className="text-slate-400 text-[10px] font-medium">Projected</span>
          </div>
          <div className="space-y-2">
            {teamA.map((p) => (
              <div key={p.participantId} className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-100 truncate max-w-[120px]">{p.name}</span>
                <div className="flex items-center gap-1.5">
                  <SkillBadge skill={p.skillLevel} />
                  <WaitTimeTracker queueEnteredAt={p.queueEnteredAt} className="text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Team B */}
        <div className="clay-inset-dark rounded-2xl p-3.5 border border-slate-800">
          <div className="text-[11px] font-black text-sky-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Team B</span>
            <span className="text-slate-400 text-[10px] font-medium">Projected</span>
          </div>
          <div className="space-y-2">
            {teamB.map((p) => (
              <div key={p.participantId} className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-100 truncate max-w-[120px]">{p.name}</span>
                <div className="flex items-center gap-1.5">
                  <SkillBadge skill={p.skillLevel} />
                  <WaitTimeTracker queueEnteredAt={p.queueEnteredAt} className="text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Algorithm reasoning bar */}
      <div className="text-[11px] text-slate-300 mb-4 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 flex items-center justify-between">
        <span className="truncate pr-2 font-medium">{reasoning}</span>
        <span className="text-emerald-400 font-mono text-[10px] font-bold shrink-0">Δ {skillDelta}</span>
      </div>

      {/* Direct Court Deployment Action */}
      <div className="relative z-10">
        {firstAvailableCourt ? (
          <button
            onClick={() => onStartOnCourt(firstAvailableCourt, proposal)}
            className="w-full py-3.5 clay-btn clay-btn-primary rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-lg"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Seat & Start on {firstAvailableCourt.name}</span>
          </button>
        ) : (
          <div className="w-full py-3 bg-slate-800/90 text-slate-300 text-xs rounded-2xl text-center border border-slate-700 font-medium">
            All courts currently playing. Group will take next finished court.
          </div>
        )}
      </div>
    </div>
  );
};
