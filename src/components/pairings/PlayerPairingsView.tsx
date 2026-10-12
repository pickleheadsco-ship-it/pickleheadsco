import React, { useState, useMemo } from 'react';
import { Court, Match, Participant, GroupMatchProposal } from '../../types';
import { SkillBadge } from '../ui/Badge';
import { MatchTimer } from '../ui/WaitTimeTracker';
import { Users, Shuffle, Trophy, Clock, CheckCircle2, ChevronRight, Activity, ArrowRightLeft } from 'lucide-react';

interface PlayerPairingsViewProps {
  courts: Court[];
  activeMatches: Match[];
  participants: Participant[];
  nextProposal?: GroupMatchProposal | null;
  currentParticipantId?: string | null;
  isOrganizer?: boolean;
  onSwapPlayers?: (p1Id: string, p2Id: string) => void;
  onCyclePairing?: () => void;
  pairingIndex?: number;
}

export const PlayerPairingsView: React.FC<PlayerPairingsViewProps> = ({
  courts,
  activeMatches,
  participants,
  nextProposal,
  currentParticipantId,
  isOrganizer = false,
  onSwapPlayers,
  onCyclePairing,
  pairingIndex = 0,
}) => {
  const [selectedSwapP1, setSelectedSwapP1] = useState<string | null>(null);

  const getPlayer = (id: string): Participant | undefined => {
    return participants.find((p) => p.participantId === id);
  };

  // Pairings across all active matches
  const activeCourtPairings = useMemo(() => {
    return courts
      .map((court) => {
        const match = activeMatches.find((m) => m.courtId === court.courtId);
        if (!match || court.status !== 'playing') return null;

        const teamAPlayers = (match.teamA || []).map(getPlayer).filter(Boolean) as Participant[];
        const teamBPlayers = (match.teamB || []).map(getPlayer).filter(Boolean) as Participant[];

        const isUserPlaying = match.playerIds?.includes(currentParticipantId || '');
        let userPartner: Participant | null = null;
        if (isUserPlaying && currentParticipantId) {
          if (match.teamA.includes(currentParticipantId)) {
            const partnerId = match.teamA.find((id) => id !== currentParticipantId);
            userPartner = partnerId ? getPlayer(partnerId) || null : null;
          } else if (match.teamB.includes(currentParticipantId)) {
            const partnerId = match.teamB.find((id) => id !== currentParticipantId);
            userPartner = partnerId ? getPlayer(partnerId) || null : null;
          }
        }

        return {
          court,
          match,
          teamAPlayers,
          teamBPlayers,
          isUserPlaying,
          userPartner,
        };
      })
      .filter(Boolean) as {
        court: Court;
        match: Match;
        teamAPlayers: Participant[];
        teamBPlayers: Participant[];
        isUserPlaying: boolean;
        userPartner: Participant | null;
      }[];
  }, [courts, activeMatches, participants, currentParticipantId]);

  // Session Partnerships Log: Calculate who partnered with whom and their win records
  const sessionPartnerships = useMemo(() => {
    const partnershipMap = new Map<string, { p1: Participant; p2: Participant; matches: number; wins: number }>();

    for (const p of participants) {
      if (!p.previousPartnerIds || p.previousPartnerIds.length === 0) continue;
      for (const partnerId of p.previousPartnerIds) {
        if (p.participantId === partnerId) continue;
        const key = [p.participantId, partnerId].sort().join('___');
        if (!partnershipMap.has(key)) {
          const p1 = p;
          const p2 = getPlayer(partnerId);
          if (p1 && p2) {
            partnershipMap.set(key, { p1, p2, matches: 0, wins: 0 });
          }
        }
        const entry = partnershipMap.get(key);
        if (entry) {
          entry.matches += 1;
        }
      }
    }

    return Array.from(partnershipMap.values()).slice(0, 8);
  }, [participants]);

  const handlePlayerClick = (pId: string) => {
    if (!isOrganizer || !onSwapPlayers) return;
    if (!selectedSwapP1) {
      setSelectedSwapP1(pId);
    } else if (selectedSwapP1 === pId) {
      setSelectedSwapP1(null);
    } else {
      onSwapPlayers(selectedSwapP1, pId);
      setSelectedSwapP1(null);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="clay-card rounded-3xl p-5 bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 border border-emerald-100/70">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center clay-pill shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Doubles Pairing Hub
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Live team partnerships, 4-in/4-out rotations, and player synergy
              </p>
            </div>
          </div>
          <span className="text-[11px] font-black uppercase px-3 py-1 rounded-xl bg-emerald-100 text-emerald-800 clay-pill">
            {activeCourtPairings.length} Active {activeCourtPairings.length === 1 ? 'Match' : 'Matches'}
          </span>
        </div>
      </div>

      {/* 1. ACTIVE COURT PAIRINGS SECTION */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Live Court Pairings
            </h3>
            <span className="text-xs text-slate-400 font-bold font-mono">
              ({activeCourtPairings.length} courts playing)
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Doubles matchups in progress</span>
        </div>

        {activeCourtPairings.length === 0 ? (
          <div className="clay-subcard rounded-3xl p-8 text-center border-2 border-dashed border-slate-200">
            <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">No active matches currently playing</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Pairings will appear here as soon as courts are seated from the queue.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeCourtPairings.map(({ court, match, teamAPlayers, teamBPlayers, isUserPlaying, userPartner }) => (
              <div
                key={court.courtId}
                className={`clay-card rounded-3xl p-5 relative overflow-hidden transition-all ${
                  isUserPlaying ? 'ring-2 ring-emerald-500 shadow-xl' : ''
                }`}
              >
                {/* Court Top Title & Timer */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                    <div>
                      <h4 className="font-black text-slate-900 text-sm tracking-tight">{court.name}</h4>
                      <span className="text-[10px] text-slate-500 font-semibold">Doubles Match</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isUserPlaying && (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-emerald-600 text-white clay-pill shadow-xs">
                        YOUR MATCH
                      </span>
                    )}
                    <MatchTimer startedAt={match.startedAt} className="text-xs" />
                  </div>
                </div>

                {/* Highlight If User Has Partner */}
                {isUserPlaying && userPartner && (
                  <div className="mt-3 p-2.5 rounded-2xl bg-emerald-100/80 border border-emerald-300 text-emerald-950 text-xs font-bold flex items-center justify-between">
                    <span>🎾 YOUR DOUBLES PARTNER:</span>
                    <span className="font-black text-sm text-emerald-900">{userPartner.name}</span>
                  </div>
                )}

                {/* Doubles Teams Comparison */}
                <div className="mt-3.5 space-y-3">
                  {/* TEAM A */}
                  <div className="clay-subcard rounded-2xl p-3 border border-emerald-100/80">
                    <div className="flex items-center justify-between text-[11px] font-black text-emerald-800 mb-1.5 uppercase">
                      <span>TEAM A (Side 1)</span>
                      <span className="text-slate-400 font-mono">2 Players</span>
                    </div>
                    <div className="space-y-1.5">
                      {teamAPlayers.map((p) => {
                        const isYou = p.participantId === currentParticipantId;
                        return (
                          <div
                            key={p.participantId}
                            className={`flex items-center justify-between p-1.5 rounded-xl transition-all ${
                              isYou ? 'bg-amber-100/80 text-amber-950 font-black ring-1 ring-amber-300' : 'text-slate-800 font-bold'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <div className="w-6 h-6 rounded-lg bg-emerald-200 text-emerald-900 flex items-center justify-center font-black text-xs shrink-0">
                                {p.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="truncate text-xs">{p.name}</span>
                              {isYou && (
                                <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded-md">
                                  YOU
                                </span>
                              )}
                            </div>
                            <SkillBadge skill={p.skillLevel} />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* VS Indicator */}
                  <div className="relative flex items-center justify-center my-0.5">
                    <div className="border-t border-slate-200/80 w-full" />
                    <span className="clay-pill bg-white px-2.5 py-0.5 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest absolute">
                      VS
                    </span>
                  </div>

                  {/* TEAM B */}
                  <div className="clay-subcard rounded-2xl p-3 border border-sky-100/80">
                    <div className="flex items-center justify-between text-[11px] font-black text-sky-800 mb-1.5 uppercase">
                      <span>TEAM B (Side 2)</span>
                      <span className="text-slate-400 font-mono">2 Players</span>
                    </div>
                    <div className="space-y-1.5">
                      {teamBPlayers.map((p) => {
                        const isYou = p.participantId === currentParticipantId;
                        return (
                          <div
                            key={p.participantId}
                            className={`flex items-center justify-between p-1.5 rounded-xl transition-all ${
                              isYou ? 'bg-amber-100/80 text-amber-950 font-black ring-1 ring-amber-300' : 'text-slate-800 font-bold'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <div className="w-6 h-6 rounded-lg bg-sky-200 text-sky-900 flex items-center justify-center font-black text-xs shrink-0">
                                {p.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="truncate text-xs">{p.name}</span>
                              {isYou && (
                                <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded-md">
                                  YOU
                                </span>
                              )}
                            </div>
                            <SkillBadge skill={p.skillLevel} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. NEXT UP ON-DECK PAIRINGS PREVIEW */}
      {nextProposal && (
        <div className="clay-card-dark text-white rounded-3xl p-5 border border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                Next Up On-Deck Pairings
              </span>
              <span className="text-[10px] text-slate-400 font-semibold font-mono">
                (Skill Delta: {nextProposal.skillDelta})
              </span>
            </div>

            {isOrganizer && onCyclePairing && (
              <button
                type="button"
                onClick={onCyclePairing}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Cycle Pairing ({pairingIndex + 1}/3)</span>
              </button>
            )}
          </div>

          <p className="text-xs text-slate-300 font-medium">
            Next 4 players in line to enter court upon next available rotation.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Team A Next Up */}
            <div className="bg-slate-900/80 p-3 rounded-2xl border border-emerald-500/30 space-y-2">
              <div className="text-[10px] uppercase font-bold text-emerald-400">Proposed Team A</div>
              {nextProposal.teamA.map((p) => {
                const isYou = p.participantId === currentParticipantId;
                const isSelected = selectedSwapP1 === p.participantId;
                return (
                  <div
                    key={p.participantId}
                    onClick={() => handlePlayerClick(p.participantId)}
                    className={`flex items-center justify-between p-1.5 rounded-xl ${
                      isYou ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-800/80 text-white'
                    } ${isSelected ? 'ring-2 ring-emerald-400' : ''} ${isOrganizer ? 'cursor-pointer hover:bg-slate-700' : ''}`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span>{p.name}</span>
                      {isYou && <span className="text-[9px] bg-slate-950 text-amber-400 px-1 py-0.5 rounded">YOU</span>}
                    </div>
                    <SkillBadge skill={p.skillLevel} />
                  </div>
                );
              })}
            </div>

            {/* Team B Next Up */}
            <div className="bg-slate-900/80 p-3 rounded-2xl border border-sky-500/30 space-y-2">
              <div className="text-[10px] uppercase font-bold text-sky-400">Proposed Team B</div>
              {nextProposal.teamB.map((p) => {
                const isYou = p.participantId === currentParticipantId;
                const isSelected = selectedSwapP1 === p.participantId;
                return (
                  <div
                    key={p.participantId}
                    onClick={() => handlePlayerClick(p.participantId)}
                    className={`flex items-center justify-between p-1.5 rounded-xl ${
                      isYou ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-800/80 text-white'
                    } ${isSelected ? 'ring-2 ring-emerald-400' : ''} ${isOrganizer ? 'cursor-pointer hover:bg-slate-700' : ''}`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span>{p.name}</span>
                      {isYou && <span className="text-[9px] bg-slate-950 text-amber-400 px-1 py-0.5 rounded">YOU</span>}
                    </div>
                    <SkillBadge skill={p.skillLevel} />
                  </div>
                );
              })}
            </div>
          </div>

          {isOrganizer && (
            <p className="text-[11px] text-slate-400 italic">
              {selectedSwapP1 ? 'Click a second player to swap them.' : 'Tip: Click any player to swap partners.'}
            </p>
          )}
        </div>
      )}

      {/* 3. SESSION DOUBLES PAIRING SYNERGY & HISTORY */}
      {sessionPartnerships.length > 0 && (
        <div className="clay-card rounded-3xl p-5">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Session Partnerships
            </h3>
            <span className="text-xs text-slate-400 font-bold font-mono">
              {sessionPartnerships.length} recorded pairs
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {sessionPartnerships.map((pair, idx) => (
              <div
                key={idx}
                className="clay-subcard rounded-2xl p-3 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px] shrink-0">
                    🤝
                  </div>
                  <div className="truncate font-bold text-slate-900">
                    <span>{pair.p1.name}</span>
                    <span className="text-slate-400 mx-1">&</span>
                    <span>{pair.p2.name}</span>
                  </div>
                </div>
                <span className="font-mono text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-lg shrink-0">
                  {pair.matches} {pair.matches === 1 ? 'game' : 'games'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
