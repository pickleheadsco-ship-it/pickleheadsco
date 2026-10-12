import React, { useState } from 'react';
import { useSession } from '../context/SessionContext';
import { Participant, Match } from '../types';
import { SkillBadge } from '../components/ui/Badge';
import { BrandLogo } from '../components/ui/BrandLogo';
import { ProfileAvatarBadge } from '../components/profile/ProfileAvatarBadge';
import { ChampionsPodium } from '../components/podium/ChampionsPodium';
import { MatchHistoryView } from '../components/matches/MatchHistoryView';
import { ProfileModal } from '../components/profile/ProfileModal';
import { Trophy, ArrowLeft, Layers, Users } from 'lucide-react';

interface SessionSummaryProps {
  onBackToHome: () => void;
  onBackToSession: () => void;
}

export const SessionSummary: React.FC<SessionSummaryProps> = ({
  onBackToHome,
  onBackToSession,
}) => {
  const { session, participants, matches, courts } = useSession();
  const [sortBy, setSortBy] = useState<'winRate' | 'wins' | 'games'>('winRate');
  const [activeTab, setActiveTab] = useState<'podium' | 'standings' | 'matches'>('podium');
  const [selectedPlayer, setSelectedPlayer] = useState<Participant | null>(null);

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-xs text-slate-500 font-bold">Loading session summary...</p>
      </div>
    );
  }

  const activePlayers = participants.filter((p) => (p.gamesPlayed || 0) > 0);

  const sortedPlayers = [...activePlayers].sort((a, b) => {
    if (sortBy === 'winRate') {
      if ((b.winRate || 0) !== (a.winRate || 0)) return (b.winRate || 0) - (a.winRate || 0);
      return (b.wins || 0) - (a.wins || 0);
    }
    if (sortBy === 'wins') {
      if ((b.wins || 0) !== (a.wins || 0)) return (b.wins || 0) - (a.wins || 0);
      return (b.winRate || 0) - (a.winRate || 0);
    }
    if ((b.gamesPlayed || 0) !== (a.gamesPlayed || 0)) return (b.gamesPlayed || 0) - (a.gamesPlayed || 0);
    return (b.wins || 0) - (a.wins || 0);
  });

  const completedMatches = matches.filter((m) => m.status === 'completed');
  const totalGames = completedMatches.length;
  const avgGameSeconds =
    totalGames > 0
      ? Math.round(
          completedMatches.reduce((acc, m) => acc + (m.durationSeconds || 600), 0) / totalGames
        )
      : 600;
  const avgGameMins = Math.round(avgGameSeconds / 60);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-20 pb-safe">
      {/* Top Header */}
      <header className="bg-white/85 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={onBackToSession}
            className="flex items-center gap-1.5 text-xs font-black text-slate-600 hover:text-slate-900 transition-colors py-2 px-3 rounded-2xl clay-btn clay-btn-secondary cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Court</span>
          </button>

          <div className="flex items-center gap-2">
            <BrandLogo size="xs" />
            <ProfileAvatarBadge size="xs" />
            <div className="text-left">
              <h1 className="font-black text-sm sm:text-base text-slate-900 tracking-tight">
                Session Standings & Podium
              </h1>
              <p className="text-[10px] text-slate-500 font-bold">{session.name}</p>
            </div>
          </div>

          <button
            onClick={onBackToHome}
            className="px-4 py-2 rounded-2xl clay-btn clay-btn-primary text-white text-xs font-black cursor-pointer shadow-md"
          >
            Done
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-6">
        {/* ========================================================= */}
        {/* ENHANCED CHAMPIONS PODIUM: PLAYERS HOLDING PADDLE & MEDAL */}
        {/* ========================================================= */}
        <ChampionsPodium
          participants={participants}
          onSelectPlayer={(p) => setSelectedPlayer(p)}
        />

        {/* Analytics Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="clay-card rounded-2xl p-4 text-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              Total Matches
            </span>
            <span className="text-2xl font-black text-slate-900 font-mono mt-0.5 block">{totalGames}</span>
          </div>
          <div className="clay-card rounded-2xl p-4 text-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              Players
            </span>
            <span className="text-2xl font-black text-slate-900 font-mono mt-0.5 block">{participants.length}</span>
          </div>
          <div className="clay-card rounded-2xl p-4 text-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              Avg Game
            </span>
            <span className="text-2xl font-black text-emerald-600 font-mono mt-0.5 block">~{avgGameMins}m</span>
          </div>
          <div className="clay-card rounded-2xl p-4 text-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              Courts
            </span>
            <span className="text-2xl font-black text-slate-900 font-mono mt-0.5 block">{courts.length}</span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex clay-inset rounded-2xl p-1 max-w-md mx-auto text-xs font-black">
          <button
            onClick={() => setActiveTab('podium')}
            className={`flex-1 py-2 rounded-xl transition-all clay-btn flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'podium' ? 'clay-btn-secondary text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>Leaderboard</span>
          </button>
          <button
            onClick={() => setActiveTab('standings')}
            className={`flex-1 py-2 rounded-xl transition-all clay-btn flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'standings' ? 'clay-btn-secondary text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-sky-500" />
            <span>Full Standings</span>
          </button>
          <button
            onClick={() => setActiveTab('matches')}
            className={`flex-1 py-2 rounded-xl transition-all clay-btn flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'matches' ? 'clay-btn-secondary text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span>Matches ({completedMatches.length})</span>
          </button>
        </div>

        {/* Tab 1 & 2: Standings Table */}
        {(activeTab === 'podium' || activeTab === 'standings') && (
          <div className="clay-card rounded-3xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-sm">Session Player Leaderboard</h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-bold hidden sm:inline">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="clay-inset rounded-xl px-2.5 py-1 text-slate-800 font-bold focus:outline-hidden text-xs bg-white"
                >
                  <option value="winRate">Win Rate (%)</option>
                  <option value="wins">Total Wins</option>
                  <option value="games">Games Played</option>
                </select>
              </div>
            </div>

            {/* MOBILE VIEW (< 768px): Tactile Player Standings Cards */}
            <div className="block md:hidden p-4 space-y-3">
              {sortedPlayers.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 font-medium">
                  No matches completed yet in this session.
                </div>
              ) : (
                sortedPlayers.map((p, idx) => (
                  <div
                    key={p.participantId}
                    onClick={() => setSelectedPlayer(p)}
                    className="clay-subcard rounded-2xl p-3.5 flex flex-col gap-2 cursor-pointer hover:shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm font-mono w-7 text-center">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                        </span>
                        <span className="font-bold text-slate-900 text-sm">{p.name}</span>
                      </div>
                      <span className="font-black font-mono text-emerald-700 text-sm">
                        {p.winRate}% <span className="text-[10px] text-slate-400 font-normal">Win</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-600 border-t border-slate-200/60 pt-2">
                      <SkillBadge skill={p.skillLevel} />
                      <span className="font-mono text-xs font-bold text-slate-700">
                        {p.gamesPlayed} Games ({p.wins}W / {p.losses}L)
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* DESKTOP VIEW (>= 768px): Structured Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4 w-12 text-center">Rank</th>
                    <th className="py-3 px-4">Player</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Games</th>
                    <th className="py-3 px-4">Wins</th>
                    <th className="py-3 px-4">Losses</th>
                    <th className="py-3 px-4 text-right">Win Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {sortedPlayers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400 font-medium">
                        No matches completed yet in this session.
                      </td>
                    </tr>
                  ) : (
                    sortedPlayers.map((p, idx) => (
                      <tr
                        key={p.participantId}
                        onClick={() => setSelectedPlayer(p)}
                        className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-4 text-center font-black font-mono text-slate-900">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center font-black text-[10px]">
                            {p.avatarUrl ? (
                              <img src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover rounded-full" />
                            ) : (
                              p.name.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <span>{p.name}</span>
                        </td>
                        <td className="py-3 px-4">
                          <SkillBadge skill={p.skillLevel} />
                        </td>
                        <td className="py-3 px-4 font-mono font-bold">{p.gamesPlayed}</td>
                        <td className="py-3 px-4 font-mono text-emerald-700 font-bold">{p.wins}</td>
                        <td className="py-3 px-4 font-mono text-slate-500">{p.losses}</td>
                        <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                          {p.winRate}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Detailed Match Logs & History */}
        {activeTab === 'matches' && (
          <MatchHistoryView
            matches={matches}
            participants={participants}
            courts={courts}
            onSelectPlayer={(pId) => {
              const p = participants.find((item) => item.participantId === pId);
              if (p) setSelectedPlayer(p);
            }}
          />
        )}
      </main>

      {/* Player Standing & Profile Modal */}
      {selectedPlayer && (
        <ProfileModal
          isOpen={Boolean(selectedPlayer)}
          onClose={() => setSelectedPlayer(null)}
          sessionId={session.id}
          participant={selectedPlayer}
          allParticipants={participants}
          matches={matches}
        />
      )}
    </div>
  );
};
