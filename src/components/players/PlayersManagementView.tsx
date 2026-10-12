import React, { useState } from 'react';
import { Participant, Session, SkillLevel } from '../../types';
import { updateParticipantSkill, updateParticipantRestStatus, leaveSession } from '../../services/sessions/sessionService';
import { SkillBadge } from '../ui/Badge';
import {
  Users,
  Search,
  Filter,
  UserPlus,
  Link2,
  Lock,
  Unlock,
  Coffee,
  Play,
  Trash2,
  Trophy,
  Flame,
  CheckCircle,
  MoreVertical,
  Edit3,
} from 'lucide-react';

interface PlayersManagementViewProps {
  sessionId: string;
  session: Session;
  participants: Participant[];
  onOpenCheckIn: () => void;
  onOpenReclubImport: () => void;
  onOpenLockedPartners: (preselectedPlayerId?: string) => void;
  onSelectPlayerProfile?: (participant: Participant) => void;
}

export const PlayersManagementView: React.FC<PlayersManagementViewProps> = ({
  sessionId,
  session,
  participants,
  onOpenCheckIn,
  onOpenReclubImport,
  onOpenLockedPartners,
  onSelectPlayerProfile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSkill, setFilterSkill] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Active participants list
  const activeParticipants = participants.filter((p) => p.status !== 'left');

  const filteredPlayers = activeParticipants.filter((p) => {
    if (filterSkill !== 'all' && p.skillLevel !== filterSkill) return false;
    if (filterStatus === 'waiting' && (p.status !== 'waiting' || p.resting)) return false;
    if (filterStatus === 'playing' && p.status !== 'playing') return false;
    if (filterStatus === 'resting' && !p.resting) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.lockedPartnerName || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleSkillChange = async (participantId: string, newSkill: SkillLevel) => {
    setUpdatingId(participantId);
    try {
      await updateParticipantSkill(sessionId, participantId, newSkill);
    } catch (err) {
      console.error('Failed to update player skill level:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleRest = async (p: Participant) => {
    setUpdatingId(p.participantId);
    try {
      await updateParticipantRestStatus(sessionId, p.participantId, !p.resting);
    } catch (err) {
      console.error('Failed to toggle rest:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async (participantId: string) => {
    try {
      await leaveSession(sessionId, participantId);
    } catch (err) {
      console.error('Failed to remove participant:', err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Bar: Controls, Add Player, Reclub Import, Locked-in Partners */}
      <div className="clay-card rounded-3xl p-4 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left: Search & Filters */}
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search players by name..."
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl clay-inset text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-emerald-500 bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterSkill}
              onChange={(e) => setFilterSkill(e.target.value)}
              className="px-3 py-2.5 rounded-2xl clay-inset text-xs font-black text-slate-800 focus:outline-emerald-500 bg-white"
            >
              <option value="all">All Categories</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2.5 rounded-2xl clay-inset text-xs font-black text-slate-800 focus:outline-emerald-500 bg-white"
            >
              <option value="all">All Status</option>
              <option value="waiting">In Queue</option>
              <option value="playing">On Court</option>
              <option value="resting">Resting</option>
            </select>
          </div>
        </div>

        {/* Right: Quick Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={onOpenCheckIn}
            className="px-3.5 py-2.5 rounded-2xl clay-btn clay-btn-primary text-white text-xs font-black flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Check In</span>
          </button>

          <button
            onClick={onOpenReclubImport}
            className="px-3.5 py-2.5 rounded-2xl clay-btn clay-btn-secondary text-emerald-800 text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer border border-emerald-200 bg-emerald-50/60"
            title="Import Player Roster from Reclub via URL Link"
          >
            <Link2 className="w-4 h-4 text-emerald-600" />
            <span>Import Reclub</span>
          </button>

          <button
            onClick={() => onOpenLockedPartners()}
            className="px-3.5 py-2.5 rounded-2xl clay-btn clay-btn-amber text-white text-xs font-black flex items-center gap-1.5 shadow-md cursor-pointer"
            title="Manage Locked-in Doubles Partners"
          >
            <Lock className="w-4 h-4" />
            <span>Locked Partners ({session.lockedPartners?.length || 0})</span>
          </button>
        </div>
      </div>

      {/* Roster Counter & Info */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
            Session Roster ({filteredPlayers.length} of {activeParticipants.length})
          </span>
          {session.lockedPartners && session.lockedPartners.length > 0 && (
            <span className="text-[10px] font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded-lg clay-pill">
              {session.lockedPartners.length} Locked Pairs
            </span>
          )}
        </div>
        <span className="text-[11px] text-slate-500 font-medium">
          Change categories or lock partners instantly
        </span>
      </div>

      {/* Player List Grid */}
      {filteredPlayers.length === 0 ? (
        <div className="clay-card rounded-3xl p-8 text-center text-slate-500">
          <Users className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-60" />
          <p className="text-sm font-black text-slate-800">No Players Found</p>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Check in players or import your roster from Reclub to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredPlayers.map((p) => {
            const isPlaying = p.status === 'playing';
            const isUpdating = updatingId === p.participantId;
            const hasLockedPartner = Boolean(p.lockedPartnerId);

            return (
              <div
                key={p.participantId}
                className={`clay-card rounded-3xl p-4 transition-all relative overflow-hidden border ${
                  hasLockedPartner
                    ? 'border-amber-200 bg-gradient-to-br from-amber-50/30 to-white'
                    : 'border-slate-200/80'
                }`}
              >
                {/* Card Top: Avatar, Name, Category Dropdown */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div
                    onClick={() => onSelectPlayerProfile && onSelectPlayerProfile(p)}
                    className="flex items-center gap-2.5 min-w-0 cursor-pointer group"
                    title="Click to view player standings & profile"
                  >
                    <div className="w-10 h-10 rounded-2xl overflow-hidden bg-slate-800 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                      {p.avatarUrl ? (
                        <img src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <span>{p.name.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="truncate">
                      <div className="font-black text-sm text-slate-900 truncate group-hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                        <span>{p.name}</span>
                        {hasLockedPartner && (
                          <span title={`Locked partner: ${p.lockedPartnerName}`}>🔒</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        {isPlaying ? (
                          <span className="text-emerald-700 font-bold">🎾 Playing on Court</span>
                        ) : p.resting ? (
                          <span className="text-amber-700 font-bold">☕ Resting</span>
                        ) : (
                          <span>Queue Rank #{p.queuePosition || '—'}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Inline Category Switcher Dropdown */}
                  <div className="shrink-0 flex items-center gap-1">
                    <select
                      value={p.skillLevel}
                      disabled={isUpdating}
                      onChange={(e) => handleSkillChange(p.participantId, e.target.value as SkillLevel)}
                      className={`clay-subcard rounded-xl px-2 py-1 text-xs font-black appearance-none cursor-pointer focus:outline-emerald-500 capitalize ${
                        p.skillLevel === 'beginner'
                          ? 'text-sky-800 bg-sky-50'
                          : p.skillLevel === 'advanced'
                          ? 'text-amber-800 bg-amber-50'
                          : 'text-emerald-800 bg-emerald-50'
                      }`}
                      title="Change category: Beginner / Intermediate / Advanced"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                </div>

                {/* Locked Partner Status Banner */}
                {hasLockedPartner ? (
                  <div className="mb-3 p-2 rounded-xl bg-amber-100/70 border border-amber-300 text-amber-950 text-xs font-bold flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span className="text-[11px] truncate">
                        Partner: <strong>{p.lockedPartnerName || 'Assigned Partner'}</strong>
                      </span>
                    </div>
                    <button
                      onClick={() => onOpenLockedPartners(p.participantId)}
                      className="text-[10px] text-amber-800 hover:text-amber-950 font-black underline shrink-0 cursor-pointer"
                    >
                      Manage
                    </button>
                  </div>
                ) : (
                  <div className="mb-3 flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                    <span>No locked partner</span>
                    <button
                      onClick={() => onOpenLockedPartners(p.participantId)}
                      className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Lock className="w-3 h-3" />
                      <span>Lock In Partner</span>
                    </button>
                  </div>
                )}

                {/* Player Stats Row */}
                <div className="grid grid-cols-4 gap-1.5 text-center text-xs py-2 border-y border-slate-100 font-mono">
                  <div>
                    <span className="text-[9px] text-slate-400 block font-sans font-bold">GAMES</span>
                    <span className="font-black text-slate-800">{p.gamesPlayed || 0}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block font-sans font-bold">RECORD</span>
                    <span className="font-bold text-slate-700">
                      {p.wins || 0}W - {p.losses || 0}L
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block font-sans font-bold">WIN %</span>
                    <span className="font-black text-emerald-700">{p.winRate || 0}%</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block font-sans font-bold">DIFF</span>
                    <span className="font-bold text-slate-700">
                      {p.pointDifferential !== undefined
                        ? p.pointDifferential >= 0
                          ? `+${p.pointDifferential}`
                          : p.pointDifferential
                        : '0'}
                    </span>
                  </div>
                </div>

                {/* Bottom Actions Row */}
                <div className="mt-3 flex items-center justify-between gap-2 pt-1">
                  <button
                    onClick={() => onSelectPlayerProfile && onSelectPlayerProfile(p)}
                    className="py-1.5 px-3 rounded-xl clay-btn clay-btn-secondary text-slate-700 text-xs font-bold flex items-center gap-1 hover:text-emerald-800 cursor-pointer"
                  >
                    <Trophy className="w-3.5 h-3.5 text-amber-500" />
                    <span>Standing & Profile</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleRest(p)}
                      disabled={isUpdating}
                      className={`p-2 rounded-xl clay-btn ${
                        p.resting ? 'clay-btn-primary' : 'clay-btn-secondary text-slate-600'
                      }`}
                      title={p.resting ? 'Resume queue' : 'Put on rest'}
                    >
                      {p.resting ? (
                        <Play className="w-3.5 h-3.5 fill-current" />
                      ) : (
                        <Coffee className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      onClick={() => handleRemove(p.participantId)}
                      className="p-2 rounded-xl clay-btn clay-btn-secondary text-slate-400 hover:text-rose-600"
                      title="Remove player"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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
