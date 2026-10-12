import React, { useState } from 'react';
import { Match, Participant, Court } from '../../types';
import { SkillBadge } from '../ui/Badge';
import {
  Trophy,
  Clock,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Layers,
  Award,
  ChevronRight,
} from 'lucide-react';

interface MatchHistoryViewProps {
  matches: Match[];
  participants: Participant[];
  courts: Court[];
  highlightParticipantId?: string;
  onSelectPlayer?: (participantId: string) => void;
}

export const MatchHistoryView: React.FC<MatchHistoryViewProps> = ({
  matches,
  participants,
  courts,
  highlightParticipantId,
  onSelectPlayer,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourtId, setSelectedCourtId] = useState<string>('all');

  // Filter completed matches sorted newest first
  const completedMatches = matches
    .filter((m) => m.status === 'completed')
    .sort((a, b) => {
      const timeA = a.endedAt?.toMillis ? a.endedAt.toMillis() : (a.endedAt ? new Date(a.endedAt).getTime() : 0);
      const timeB = b.endedAt?.toMillis ? b.endedAt.toMillis() : (b.endedAt ? new Date(b.endedAt).getTime() : 0);
      return timeB - timeA;
    });

  const getPlayer = (id: string): Participant | undefined => {
    return participants.find((p) => p.participantId === id);
  };

  const filteredMatches = completedMatches.filter((m) => {
    // Court filter
    if (selectedCourtId !== 'all' && m.courtId !== selectedCourtId) {
      return false;
    }

    // Search query by player names
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const allPlayerNames = [
        ...(m.teamA || []).map((id) => getPlayer(id)?.name || ''),
        ...(m.teamB || []).map((id) => getPlayer(id)?.name || ''),
        ...(m.teamANames || []),
        ...(m.teamBNames || []),
      ]
        .join(' ')
        .toLowerCase();

      return allPlayerNames.includes(query) || (m.courtName || '').toLowerCase().includes(query);
    }

    return true;
  });

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="clay-card rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by player or court name..."
            className="w-full pl-9 pr-4 py-2 rounded-xl clay-inset text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-emerald-500 bg-white"
          />
        </div>

        {/* Court Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 hidden sm:block shrink-0" />
          <select
            value={selectedCourtId}
            onChange={(e) => setSelectedCourtId(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl clay-inset text-xs font-black text-slate-800 focus:outline-emerald-500 bg-white"
          >
            <option value="all">All Courts ({completedMatches.length} Matches)</option>
            {courts.map((c) => (
              <option key={c.courtId} value={c.courtId}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Matches Count Header */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-black text-slate-600 uppercase tracking-wider">
          Completed Match Logs ({filteredMatches.length})
        </span>
        <span className="text-[11px] text-slate-500 font-bold">
          Official 4-In / 4-Out Rotations
        </span>
      </div>

      {/* Match Cards List */}
      {filteredMatches.length === 0 ? (
        <div className="clay-card rounded-3xl p-8 text-center text-slate-500">
          <Layers className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-60" />
          <p className="text-sm font-black text-slate-800">No Match Logs Found</p>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {completedMatches.length === 0
              ? 'Complete matches on court to log official game results and stats here.'
              : 'Try clearing your search query or court filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMatches.map((m, idx) => {
            const isWinnerA = m.winningTeam === 'teamA';
            const isWinnerB = m.winningTeam === 'teamB';
            const scoreA = m.score?.teamA ?? (isWinnerA ? 11 : 9);
            const scoreB = m.score?.teamB ?? (isWinnerB ? 11 : 9);

            const durationMins = m.durationSeconds ? Math.round(m.durationSeconds / 60) : 10;

            const timeStr = m.endedAt?.toDate
              ? m.endedAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Finished';

            const userInTeamA = highlightParticipantId && (m.teamA || []).includes(highlightParticipantId);
            const userInTeamB = highlightParticipantId && (m.teamB || []).includes(highlightParticipantId);
            const userWon = (userInTeamA && isWinnerA) || (userInTeamB && isWinnerB);

            return (
              <div
                key={m.matchId || idx}
                className={`clay-card rounded-2xl p-4 transition-all hover:shadow-md border ${
                  userWon
                    ? 'border-emerald-300 bg-gradient-to-r from-emerald-50/40 to-white'
                    : 'border-slate-200/80'
                }`}
              >
                {/* Top Row: Court, Time & Duration */}
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg clay-pill text-[11px]">
                      {m.courtName || 'Court'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{durationMins}m game</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-mono font-bold">
                      {timeStr}
                    </span>
                    {m.matchingMode && (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        {m.matchingMode}
                      </span>
                    )}
                  </div>
                </div>

                {/* Score & Teams Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-7 gap-3 items-center">
                  {/* TEAM A */}
                  <div
                    className={`md:col-span-3 p-3 rounded-2xl transition-all ${
                      isWinnerA
                        ? 'bg-emerald-50/80 border border-emerald-300 ring-1 ring-emerald-400/30'
                        : 'bg-slate-50/70 border border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                          Team A
                        </span>
                        {isWinnerA && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded-lg">
                            <Trophy className="w-3 h-3 text-emerald-700" />
                            <span>WINNER</span>
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-xl font-black font-mono ${
                          isWinnerA ? 'text-emerald-700' : 'text-slate-600'
                        }`}
                      >
                        {scoreA}
                      </span>
                    </div>

                    {/* Players A */}
                    <div className="space-y-1.5">
                      {(m.teamA || []).map((id, pIdx) => {
                        const player = getPlayer(id);
                        const isYou = highlightParticipantId === id;
                        return (
                          <div
                            key={id || pIdx}
                            onClick={() => onSelectPlayer && onSelectPlayer(id)}
                            className={`flex items-center justify-between text-xs py-1 px-2 rounded-xl transition-all ${
                              onSelectPlayer ? 'hover:bg-white/80 cursor-pointer' : ''
                            } ${isYou ? 'bg-amber-100 text-amber-950 font-black ring-1 ring-amber-300' : ''}`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <div className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center font-black text-[9px] shrink-0">
                                {player?.name?.slice(0, 2).toUpperCase() || 'P'}
                              </div>
                              <span className="font-bold text-slate-900 truncate">
                                {player?.name || `Player ${pIdx + 1}`}
                              </span>
                              {isYou && (
                                <span className="text-[9px] font-black uppercase text-amber-800 bg-amber-200 px-1.5 rounded-sm">
                                  YOU
                                </span>
                              )}
                            </div>
                            {player && <SkillBadge skill={player.skillLevel} />}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* VS / SCORE BADGE CENTER */}
                  <div className="md:col-span-1 text-center py-1">
                    <span className="font-black text-xs text-slate-400 font-mono block">
                      VS
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-500">
                      {scoreA} - {scoreB}
                    </span>
                  </div>

                  {/* TEAM B */}
                  <div
                    className={`md:col-span-3 p-3 rounded-2xl transition-all ${
                      isWinnerB
                        ? 'bg-emerald-50/80 border border-emerald-300 ring-1 ring-emerald-400/30'
                        : 'bg-slate-50/70 border border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                          Team B
                        </span>
                        {isWinnerB && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded-lg">
                            <Trophy className="w-3 h-3 text-emerald-700" />
                            <span>WINNER</span>
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-xl font-black font-mono ${
                          isWinnerB ? 'text-emerald-700' : 'text-slate-600'
                        }`}
                      >
                        {scoreB}
                      </span>
                    </div>

                    {/* Players B */}
                    <div className="space-y-1.5">
                      {(m.teamB || []).map((id, pIdx) => {
                        const player = getPlayer(id);
                        const isYou = highlightParticipantId === id;
                        return (
                          <div
                            key={id || pIdx}
                            onClick={() => onSelectPlayer && onSelectPlayer(id)}
                            className={`flex items-center justify-between text-xs py-1 px-2 rounded-xl transition-all ${
                              onSelectPlayer ? 'hover:bg-white/80 cursor-pointer' : ''
                            } ${isYou ? 'bg-amber-100 text-amber-950 font-black ring-1 ring-amber-300' : ''}`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <div className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center font-black text-[9px] shrink-0">
                                {player?.name?.slice(0, 2).toUpperCase() || 'P'}
                              </div>
                              <span className="font-bold text-slate-900 truncate">
                                {player?.name || `Player ${pIdx + 1}`}
                              </span>
                              {isYou && (
                                <span className="text-[9px] font-black uppercase text-amber-800 bg-amber-200 px-1.5 rounded-sm">
                                  YOU
                                </span>
                              )}
                            </div>
                            {player && <SkillBadge skill={player.skillLevel} />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
