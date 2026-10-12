import React, { useState, useEffect, useRef } from 'react';
import { useSession } from '../context/SessionContext';
import { Participant, Court, Match } from '../types';
import { SkillBadge, StatusBadge } from '../components/ui/Badge';
import { WaitTimeTracker, MatchTimer } from '../components/ui/WaitTimeTracker';
import { BrandLogo } from '../components/ui/BrandLogo';
import { ProfileAvatarBadge } from '../components/profile/ProfileAvatarBadge';
import { ProfileModal } from '../components/profile/ProfileModal';
import { LiveLeaderboard } from '../components/leaderboard/LiveLeaderboard';
import { PlayerPairingsView } from '../components/pairings/PlayerPairingsView';
import { MatchHistoryView } from '../components/matches/MatchHistoryView';
import { NextPlayModal } from '../components/notifications/NextPlayModal';
import { PostGameLeaderboardModal } from '../components/notifications/PostGameLeaderboardModal';
import { notificationService } from '../services/notifications/notificationService';
import {
  updateParticipantRestStatus,
  leaveSession,
} from '../services/sessions/sessionService';
import {
  Sparkles,
  Coffee,
  Play,
  LogOut,
  Trophy,
  CheckCircle,
  AlertCircle,
  Users,
  Bell,
  BellRing,
  ArrowRight,
  Activity,
} from 'lucide-react';

interface PlayerSessionProps {
  onLeaveToHome: () => void;
  onOpenJoinScreen: () => void;
}

export const PlayerSession: React.FC<PlayerSessionProps> = ({
  onLeaveToHome,
  onOpenJoinScreen,
}) => {
  const {
    sessionId,
    session,
    courts,
    participants,
    waitingQueue,
    activeMatches,
    matches,
    nextProposal,
    currentParticipant,
    setCurrentParticipantId,
    loading,
    error,
  } = useSession();

  const [matchAcknowledged, setMatchAcknowledged] = useState(false);
  const [isUpdatingRest, setIsUpdatingRest] = useState(false);
  const [showPostGameModal, setShowPostGameModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [playerTab, setPlayerTab] = useState<'myQueue' | 'pairings' | 'players' | 'history' | 'leaderboard'>('myQueue');
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Push notifications & Next Play Pop-Up state
  const [notificationPerm, setNotificationPerm] = useState<NotificationPermission>(() =>
    notificationService.getPermission()
  );
  const [nextPlayAlert, setNextPlayAlert] = useState<{ open: boolean; type: 'playing' | 'on_deck' }>({
    open: false,
    type: 'on_deck',
  });
  const [hasDismissedOnDeck, setHasDismissedOnDeck] = useState(false);
  const [hasDismissedPlaying, setHasDismissedPlaying] = useState(false);

  // References to track match transitions and prevent repeat popups
  const prevMatchIdRef = useRef<string | null>(null);
  const prevGamesPlayedRef = useRef<number>(currentParticipant?.gamesPlayed || 0);
  const dismissedPlayingMatchIdRef = useRef<string | null>(null);
  const dismissedOnDeckProposalRef = useRef<string | null>(null);

  // Check if player is currently playing on an active match
  const activeMatch = currentParticipant
    ? activeMatches.find((m) => m.playerIds.includes(currentParticipant.participantId))
    : null;
  const activeCourt = activeMatch ? courts.find((c) => c.courtId === activeMatch.courtId) : null;

  // Check if current participant is in the next group proposal (On Deck)
  const isOnDeck = Boolean(
    currentParticipant &&
      nextProposal &&
      nextProposal.players.some((p) => p.participantId === currentParticipant.participantId)
  );

  // Calculate player's live position in the waiting queue
  const playerQueueIndex = currentParticipant
    ? waitingQueue.findIndex((p) => p.participantId === currentParticipant.participantId)
    : -1;
  const queuePos = playerQueueIndex !== -1 ? playerQueueIndex + 1 : null;
  const estimatedWaitMins = queuePos ? Math.max(2, Math.round((queuePos / 4) * 12)) : 0;

  // Deterministic evaluation for Next Play alerts & Post-Game Leaderboard
  useEffect(() => {
    if (!currentParticipant) return;

    const currentMatchId = activeMatch?.matchId || null;
    const currentGamesCount = currentParticipant.gamesPlayed || 0;

    // 1. Post-Game Leaderboard trigger: match just ended or games played count incremented
    if (
      prevMatchIdRef.current &&
      !currentMatchId &&
      (currentGamesCount > prevGamesPlayedRef.current || currentParticipant.lastMatchResult)
    ) {
      setShowPostGameModal(true);
    } else if (
      prevGamesPlayedRef.current > 0 &&
      currentGamesCount > prevGamesPlayedRef.current &&
      !activeMatch
    ) {
      setShowPostGameModal(true);
    }

    // 2. Next Play: Called to active match on court
    if (activeMatch && activeCourt && dismissedPlayingMatchIdRef.current !== activeMatch.matchId) {
      setNextPlayAlert({ open: true, type: 'playing' });
      notificationService.playChime('urgent');
    } else if (isOnDeck && nextProposal && !activeMatch) {
      const proposalKey = nextProposal.players.map((p) => p.participantId).sort().join(',');
      if (dismissedOnDeckProposalRef.current !== proposalKey) {
        setNextPlayAlert({ open: true, type: 'on_deck' });
        notificationService.playChime('alert');
      }
    }

    prevMatchIdRef.current = currentMatchId;
    prevGamesPlayedRef.current = currentGamesCount;
  }, [
    currentParticipant?.status,
    currentParticipant?.gamesPlayed,
    currentParticipant?.lastMatchResult,
    activeMatch?.matchId,
    activeCourt?.courtId,
    isOnDeck,
    nextProposal,
  ]);

  // Reset dismissal memory when player returns to regular waiting queue
  useEffect(() => {
    if (currentParticipant?.status === 'waiting' && !isOnDeck && !activeMatch) {
      setHasDismissedOnDeck(false);
      setHasDismissedPlaying(false);
      dismissedPlayingMatchIdRef.current = null;
      dismissedOnDeckProposalRef.current = null;
    }
  }, [currentParticipant?.status, isOnDeck, activeMatch]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="clay-card rounded-3xl p-8 text-center max-w-xs w-full">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-slate-800">Loading Session Queue...</p>
        </div>
      </div>
    );
  }

  if (error || !session || !sessionId) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="clay-card rounded-3xl p-8 text-center max-w-sm w-full">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h3 className="font-black text-slate-900 text-base">Session Unavailable</h3>
          <p className="text-xs text-slate-500 mt-1 mb-5">{error || 'This session has concluded or does not exist.'}</p>
          <button
            onClick={onLeaveToHome}
            className="w-full py-3.5 clay-btn clay-btn-primary rounded-2xl text-xs font-black"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // If user has not joined this session yet, redirect them to Join Screen
  if (!currentParticipant || currentParticipant.status === 'left') {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-between max-w-md mx-auto p-4 sm:p-6">
        <div className="clay-card rounded-3xl p-7 text-center my-auto">
          <div className="flex items-center justify-center gap-3.5 mb-4">
            <BrandLogo size="lg" />
            <ProfileAvatarBadge
              size="lg"
              onClick={() => setShowProfileModal(true)}
            />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{session.name}</h2>
          <p className="text-xs text-slate-500 font-medium mt-1">{session.venueName}</p>

          <div className="my-6 p-4 clay-subcard rounded-2xl text-left space-y-2.5 text-xs text-slate-700 font-medium">
            <div className="flex justify-between items-center">
              <span>Status:</span>
              <span className="font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg clay-pill uppercase">{session.status}</span>
            </div>
            <div className="flex justify-between">
              <span>Courts Open:</span>
              <span className="font-bold text-slate-900">{session.numberOfCourts} Courts</span>
            </div>
            <div className="flex justify-between">
              <span>Waiting in Queue:</span>
              <span className="font-bold text-slate-900">{waitingQueue.length} Players</span>
            </div>
          </div>

          <button
            onClick={onOpenJoinScreen}
            className="w-full py-4 clay-btn clay-btn-primary rounded-2xl text-sm font-black shadow-lg"
          >
            Join Queue Now
          </button>
        </div>
      </div>
    );
  }

  // Rest / Resume toggle
  const handleToggleRest = async () => {
    setIsUpdatingRest(true);
    try {
      await updateParticipantRestStatus(
        sessionId,
        currentParticipant.participantId,
        !currentParticipant.resting
      );
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingRest(false);
    }
  };

  // Leave queue cleanly with confirmation
  const confirmLeaveQueue = async () => {
    setShowLeaveModal(false);
    try {
      if (currentParticipant) {
        await leaveSession(sessionId, currentParticipant.participantId);
        localStorage.removeItem(`picklequeue_session_${sessionId}_participant_id`);
        setCurrentParticipantId(null);
      }
      onLeaveToHome();
    } catch (err) {
      console.error('Error leaving session queue:', err);
      onLeaveToHome();
    }
  };

  const handleRequestNotifications = async () => {
    const perm = await notificationService.requestPermission();
    setNotificationPerm(perm);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-20 pb-safe max-w-md mx-auto flex flex-col justify-between">
      {/* Mobile Top Header */}
      <header className="bg-white/90 backdrop-blur-md px-4 py-3 sticky top-0 z-40 border-b border-slate-200/60 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrandLogo size="xs" />
            <ProfileAvatarBadge
              size="xs"
              onClick={() => setShowProfileModal(true)}
            />
            <div>
              <h1 className="font-black text-slate-900 text-sm leading-tight tracking-tight truncate max-w-[140px] sm:max-w-[170px]">
                {session.name}
              </h1>
              <p className="text-[10px] text-slate-500 font-bold">
                {session.venueName} • 4-In / 4-Out
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRequestNotifications}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-black flex items-center gap-1 transition-all clay-btn ${
                notificationPerm === 'granted'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
              }`}
              title={
                notificationPerm === 'granted'
                  ? 'Device alerts active'
                  : 'Click to enable turn & queue alerts'
              }
            >
              {notificationPerm === 'granted' ? (
                <Bell className="w-3 h-3 text-emerald-600" />
              ) : (
                <BellRing className="w-3 h-3 text-amber-600" />
              )}
              <span>{notificationPerm === 'granted' ? 'Alerts On' : 'Alerts'}</span>
            </button>
            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-xl bg-emerald-100 text-emerald-800 uppercase tracking-wider clay-pill">
              {session.status}
            </span>
          </div>
        </div>

        {/* View Switcher: My Court vs Pairings vs Players vs History vs Live Leaderboard */}
        <div className="flex items-center gap-1 clay-inset rounded-2xl p-1 mt-2.5 text-[11px] font-black overflow-x-auto">
          <button
            onClick={() => setPlayerTab('myQueue')}
            className={`py-1.5 px-2.5 rounded-xl transition-all clay-btn flex items-center justify-center gap-1 shrink-0 ${
              playerTab === 'myQueue' ? 'clay-btn-primary text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>My Court</span>
          </button>
          <button
            onClick={() => setPlayerTab('pairings')}
            className={`py-1.5 px-2.5 rounded-xl transition-all clay-btn flex items-center justify-center gap-1 shrink-0 ${
              playerTab === 'pairings' ? 'clay-btn-primary text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-sky-500" />
            <span>Pairings</span>
          </button>
          <button
            onClick={() => setPlayerTab('players')}
            className={`py-1.5 px-2.5 rounded-xl transition-all clay-btn flex items-center justify-center gap-1 shrink-0 ${
              playerTab === 'players' ? 'clay-btn-primary text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            <span>Players</span>
          </button>
          <button
            onClick={() => setPlayerTab('history')}
            className={`py-1.5 px-2.5 rounded-xl transition-all clay-btn flex items-center justify-center gap-1 shrink-0 ${
              playerTab === 'history' ? 'clay-btn-primary text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            <span>History</span>
          </button>
          <button
            onClick={() => setPlayerTab('leaderboard')}
            className={`py-1.5 px-2.5 rounded-xl transition-all clay-btn flex items-center justify-center gap-1 shrink-0 ${
              playerTab === 'leaderboard' ? 'clay-btn-primary text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>Leaderboard</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="p-4 space-y-4 flex-1">
        {playerTab === 'leaderboard' ? (
          <div>
            <LiveLeaderboard
              participants={participants}
              courts={courts}
              activeMatches={activeMatches}
              highlightParticipantId={currentParticipant.participantId}
            />
          </div>
        ) : playerTab === 'pairings' ? (
          <PlayerPairingsView
            courts={courts}
            activeMatches={activeMatches}
            participants={participants}
            nextProposal={nextProposal}
            currentParticipantId={currentParticipant.participantId}
            isOrganizer={false}
          />
        ) : playerTab === 'history' ? (
          <div className="space-y-3">
            <MatchHistoryView
              matches={matches}
              participants={participants}
              courts={courts}
              highlightParticipantId={currentParticipant.participantId}
            />
          </div>
        ) : playerTab === 'players' ? (
          <div className="clay-card rounded-3xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-sm text-slate-900">
                Session Roster ({participants.filter((p) => p.status !== 'left').length})
              </h3>
              <button
                onClick={() => setShowProfileModal(true)}
                className="text-[11px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl clay-btn"
              >
                Edit My Profile / Category
              </button>
            </div>

            <div className="space-y-2">
              {participants
                .filter((p) => p.status !== 'left')
                .map((p) => {
                  const isYou = p.participantId === currentParticipant.participantId;
                  return (
                    <div
                      key={p.participantId}
                      className={`p-3 rounded-2xl flex items-center justify-between gap-2 border transition-all ${
                        isYou
                          ? 'bg-amber-50/80 border-amber-300 ring-1 ring-amber-400/30'
                          : 'bg-white border-slate-200/70'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-black text-xs shrink-0">
                          {p.avatarUrl ? (
                            <img src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover rounded-full" />
                          ) : (
                            p.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-1.5 font-black text-xs text-slate-900 truncate">
                            <span>{p.name}</span>
                            {isYou && (
                              <span className="text-[9px] font-black uppercase text-amber-800 bg-amber-200 px-1.5 rounded-sm">
                                YOU
                              </span>
                            )}
                            {p.lockedPartnerId && <span title="Locked partner">🔒</span>}
                          </div>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {p.status === 'playing'
                              ? '🎾 Playing on court'
                              : p.resting
                              ? '☕ Resting'
                              : `Queue Rank #${p.queuePosition || '—'}`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <SkillBadge skill={p.skillLevel} />
                        <span className="text-xs font-mono font-bold text-slate-700">
                          {p.wins || 0}W
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ) : (
          <>
            {/* Notification Permission Card Banner (if not enabled) */}
            {notificationPerm !== 'granted' && (
              <div className="clay-subcard rounded-2xl p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 flex items-center justify-between gap-2.5 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <BellRing className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <span className="font-black text-amber-950 text-xs block">
                      Turn & Next-Play Alerts
                    </span>
                    <span className="text-[10px] text-amber-800 font-medium block">
                      Get chime and push notifications when called
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRequestNotifications}
                  className="px-3 py-1.5 rounded-xl clay-btn clay-btn-amber text-white text-[11px] font-black shrink-0 shadow-xs"
                >
                  Turn On
                </button>
              </div>
            )}
            {/* ========================================================= */}
            {/* CRITICAL TAKEOVER: YOUR MATCH IS READY                    */}
            {/* ========================================================= */}
            {activeMatch && activeCourt && !matchAcknowledged && (
              <div className="clay-card rounded-3xl p-5 bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-2xl border-2 border-emerald-300">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-3 h-3 rounded-full bg-white animate-ping" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-100">
                    Live Match Ready
                  </span>
                </div>

                <h2 className="text-2xl font-black tracking-tight leading-tight mb-1">
                  YOUR MATCH IS READY!
                </h2>
                <div className="inline-block bg-white/20 backdrop-blur-xs px-3.5 py-1 rounded-xl text-sm font-black mb-4 clay-pill">
                  Proceed to {activeCourt.name}
                </div>

                {/* Players Breakdown */}
                <div className="clay-inset-dark rounded-2xl p-3 text-xs mb-4 space-y-2 border border-emerald-500/30">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-200 block mb-1">Team A</span>
                    <div className="flex gap-2">
                      {activeMatch.teamA.map((id) => {
                        const isYou = id === currentParticipant.participantId;
                        const p = participants.find((item) => item.participantId === id);
                        return (
                          <span
                            key={id}
                            className={`px-2.5 py-1 rounded-xl text-xs font-black ${
                              isYou ? 'bg-amber-400 text-slate-950 ring-2 ring-white' : 'bg-white/20 text-white'
                            }`}
                          >
                            {isYou ? 'YOU' : p?.name || 'Player'}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-200 block mb-1">Team B</span>
                    <div className="flex gap-2">
                      {activeMatch.teamB.map((id) => {
                        const isYou = id === currentParticipant.participantId;
                        const p = participants.find((item) => item.participantId === id);
                        return (
                          <span
                            key={id}
                            className={`px-2.5 py-1 rounded-xl text-xs font-black ${
                              isYou ? 'bg-amber-400 text-slate-950 ring-2 ring-white' : 'bg-white/20 text-white'
                            }`}
                          >
                            {isYou ? 'YOU' : p?.name || 'Player'}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setMatchAcknowledged(true)}
                  className="w-full py-4 bg-white text-emerald-950 font-black rounded-2xl text-sm shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <span>Got it — Heading to Court</span>
                </button>
              </div>
            )}

            {/* ========================================================= */}
            {/* PROMINENT "YOU" STATUS CARD (CLAYMORPHISM)                */}
            {/* ========================================================= */}
            <div className="clay-card rounded-3xl p-5 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2.5">
                  <ProfileAvatarBadge
                    size="sm"
                    onClick={() => setShowProfileModal(true)}
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="clay-pill bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-lg tracking-wider uppercase shadow-xs">
                        YOU
                      </span>
                      <span className="font-black text-slate-900 text-base leading-tight">{currentParticipant.name}</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProfileModal(true)}
                  className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Click to view standing or change category"
                >
                  <SkillBadge skill={currentParticipant.skillLevel} />
                  <span className="text-[10px] font-black text-slate-500 underline">Edit</span>
                </button>
              </div>

              {/* If currently playing */}
              {activeCourt && activeMatch ? (
                <div className="clay-subcard rounded-2xl p-4 text-center border border-emerald-200 bg-emerald-50/40">
                  <span className="text-xs font-black text-emerald-800 uppercase tracking-wider block">Currently Playing on</span>
                  <span className="text-2xl font-black text-emerald-950 mt-0.5 block">{activeCourt.name}</span>
                  <div className="mt-2.5 mb-2 inline-block">
                    <MatchTimer startedAt={activeMatch?.startedAt} className="text-xs" />
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/90 border border-emerald-200 text-slate-700 text-xs font-bold space-y-1">
                    <div className="text-[11px] text-emerald-800 font-black uppercase tracking-wider">
                      🎾 Doubles Match In Progress
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      Official scores & court rotation are entered by court staff/organizer terminal upon game finish.
                    </div>
                  </div>
                </div>
              ) : currentParticipant.resting ? (
                /* If resting */
                <div className="clay-subcard rounded-2xl p-4 text-center border border-amber-200 bg-amber-50/60">
                  <Coffee className="w-7 h-7 text-amber-600 mx-auto mb-1.5" />
                  <span className="text-sm font-black text-amber-950 block">You are resting</span>
                  <p className="text-[11px] text-amber-800 mt-0.5 font-medium">
                    The queue will skip you until you resume. Your place in rotation is kept.
                  </p>
                </div>
              ) : (
                /* Waiting in Queue */
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="clay-inset rounded-2xl p-3.5 text-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                      Queue Rank
                    </span>
                    <span className="text-3xl font-black text-slate-900 font-mono mt-0.5 block">
                      #{queuePos ?? '—'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold block mt-1">
                      of {waitingQueue.length} in queue
                    </span>
                  </div>

                  <div className="clay-inset rounded-2xl p-3.5 text-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                      Est. Wait
                    </span>
                    <span className="text-3xl font-black text-emerald-600 font-mono mt-0.5 block">
                      ~{estimatedWaitMins}m
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold block mt-1">
                      <WaitTimeTracker queueEnteredAt={currentParticipant.queueEnteredAt} />
                    </span>
                  </div>
                </div>
              )}

              {/* Session Stats Record */}
              <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-600 font-mono font-bold">
                <div>
                  Games: <span className="text-slate-900">{currentParticipant.gamesPlayed}</span>
                </div>
                <div>
                  Record: <span className="text-emerald-700">{currentParticipant.wins}W</span> -{' '}
                  <span className="text-slate-500">{currentParticipant.losses}L</span>
                </div>
                <div>
                  Win Rate: <span className="text-slate-900">{currentParticipant.winRate}%</span>
                </div>
              </div>

              {/* Player Controls (Rest / Resume / Leave Queue) */}
              <div className="mt-4 flex items-center gap-2.5">
                {!activeCourt && (
                  <button
                    onClick={handleToggleRest}
                    disabled={isUpdatingRest}
                    className={`flex-1 py-3 rounded-2xl text-xs font-black transition-all clay-btn flex items-center justify-center gap-1.5 ${
                      currentParticipant.resting ? 'clay-btn-primary' : 'clay-btn-amber'
                    }`}
                  >
                    {currentParticipant.resting ? (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Resume Queue</span>
                      </>
                    ) : (
                      <>
                        <Coffee className="w-3.5 h-3.5" />
                        <span>Take a Rest</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  onClick={() => setShowLeaveModal(true)}
                  className="py-3 px-4 rounded-2xl clay-btn clay-btn-secondary text-slate-600 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  title="Leave queue"
                >
                  <LogOut className="w-3.5 h-3.5 text-slate-400" />
                  <span>Leave Queue</span>
                </button>
              </div>
            </div>

            {/* Current Active Courts */}
            <div className="clay-card rounded-3xl p-5">
              <div className="flex items-center justify-between mb-3.5">
                <h3 className="font-black text-sm text-slate-900">Live Courts</h3>
                <span className="text-xs text-slate-400 font-mono font-bold">{courts.length} courts</span>
              </div>

              <div className="space-y-2.5">
                {courts.map((court) => {
                  const match = activeMatches.find((m) => m.courtId === court.courtId);
                  const isPlaying = court.status === 'playing' && Boolean(match);

                  return (
                    <div
                      key={court.courtId}
                      className="p-3.5 rounded-2xl clay-subcard flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-3 h-3 rounded-full ${
                            isPlaying ? 'bg-emerald-500 shadow-sm' : 'bg-slate-300'
                          }`}
                        />
                        <div>
                          <span className="font-black text-xs text-slate-900 block">{court.name}</span>
                          <span className="text-[11px] text-slate-500 truncate max-w-[180px] block font-medium">
                            {isPlaying && match ? (
                              match.playerIds.map((id) => {
                                if (id === currentParticipant.participantId) return 'YOU';
                                return participants.find((p) => p.participantId === id)?.name || 'Player';
                              }).join(', ')
                            ) : (
                              'Court open'
                            )}
                          </span>
                        </div>
                      </div>

                      {isPlaying && match && <MatchTimer startedAt={match.startedAt} className="text-[11px]" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Next Up Preview */}
            {nextProposal && (
              <div className="clay-card-dark text-white rounded-3xl p-5 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-400">Next Up</span>
                  <span className="text-[10px] text-slate-400 font-medium">On Deck</span>
                </div>
                <div className="space-y-2 text-xs">
                  {nextProposal.players.map((p, idx) => {
                    const isYou = p.participantId === currentParticipant.participantId;
                    return (
                      <div key={p.participantId} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-400 text-[11px] font-bold">#{idx + 1}</span>
                          <span className={`font-bold ${isYou ? 'text-amber-400 font-black' : 'text-slate-100'}`}>
                            {isYou ? 'YOU' : p.name}
                          </span>
                          {isYou && (
                            <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded-md clay-pill">
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
            )}
          </>
        )}
      </main>

      {/* Leave Queue Confirmation Dialog */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="clay-card rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-black text-slate-900">Leave Session Queue?</h3>
            <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
              Your match stats and game history are saved. You can rejoin or check in anytime. The active open-play session will continue running for other players.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                className="px-4 py-2.5 rounded-2xl clay-btn clay-btn-secondary text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmLeaveQueue}
                className="px-5 py-2.5 rounded-2xl clay-btn clay-btn-danger text-white text-xs font-black shadow-md"
              >
                Yes, Leave Queue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pop up screen upon Next Play */}
      <NextPlayModal
        isOpen={nextPlayAlert.open}
        type={nextPlayAlert.type}
        participant={currentParticipant}
        court={activeCourt}
        match={activeMatch}
        allParticipants={participants}
        notificationsEnabled={notificationPerm === 'granted'}
        onEnableNotifications={handleRequestNotifications}
        onAcknowledge={() => {
          if (nextPlayAlert.type === 'playing') {
            setHasDismissedPlaying(true);
            setMatchAcknowledged(true);
          } else {
            setHasDismissedOnDeck(true);
          }
          setNextPlayAlert((prev) => ({ ...prev, open: false }));
        }}
      />

      {/* Player Profile & Photo Modal */}
      {showProfileModal && (
        <ProfileModal
          isOpen={true}
          onClose={() => setShowProfileModal(false)}
          sessionId={sessionId}
          participantId={currentParticipant?.participantId}
          participant={currentParticipant}
          allParticipants={participants}
          matches={matches}
        />
      )}
    </div>
  );
};
