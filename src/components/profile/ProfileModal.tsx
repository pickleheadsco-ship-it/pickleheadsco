import React, { useState, useRef, useEffect } from 'react';
import {
  usePlayerProfile,
  profileService,
  PlayerProfile,
} from '../../services/profile/profileService';
import { SkillLevel, Participant, Match } from '../../types';
import { firePickleballBurst } from '../../services/fx/pickleballBurst';
import {
  updateParticipantProfile,
  updateParticipantSkill,
} from '../../services/sessions/sessionService';
import { SkillBadge } from '../ui/Badge';
import {
  X,
  Camera,
  Upload,
  Trash2,
  Check,
  User,
  Sparkles,
  Trophy,
  Flame,
  Clock,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId?: string;
  participantId?: string;
  participant?: Participant | null;
  allParticipants?: Participant[];
  matches?: Match[];
  onSaved?: (profile: PlayerProfile) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  sessionId,
  participantId,
  participant,
  allParticipants = [],
  matches = [],
  onSaved,
}) => {
  const { profile, updateProfile } = usePlayerProfile();

  // Resolve target participant if provided or looked up
  const activeParticipant =
    participant ||
    (participantId ? allParticipants.find((p) => p.participantId === participantId) : null);

  const [firstName, setFirstName] = useState(
    activeParticipant?.firstName || profile.firstName || ''
  );
  const [surname, setSurname] = useState(
    activeParticipant?.surname || profile.surname || ''
  );
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(
    activeParticipant?.skillLevel || profile.skillLevel || 'intermediate'
  );
  const [avatarUrl, setAvatarUrl] = useState<string>(
    activeParticipant?.avatarUrl || profile.avatarUrl || ''
  );
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (activeParticipant) {
        setFirstName(activeParticipant.firstName || activeParticipant.name.split(' ')[0] || '');
        setSurname(activeParticipant.surname || activeParticipant.name.split(' ').slice(1).join(' ') || '');
        setSkillLevel(activeParticipant.skillLevel || 'intermediate');
        setAvatarUrl(activeParticipant.avatarUrl || '');
      } else {
        setFirstName(profile.firstName || '');
        setSurname(profile.surname || '');
        setSkillLevel(profile.skillLevel || 'intermediate');
        setAvatarUrl(profile.avatarUrl || '');
      }
    }
  }, [isOpen, activeParticipant, profile.firstName, profile.surname, profile.skillLevel, profile.avatarUrl]);

  if (!isOpen) return null;

  // Calculate Standing rank if participant in session
  const sortedByRank = [...allParticipants]
    .filter((p) => (p.gamesPlayed || 0) > 0)
    .sort((a, b) => {
      if ((b.winRate || 0) !== (a.winRate || 0)) return (b.winRate || 0) - (a.winRate || 0);
      if ((b.wins || 0) !== (a.wins || 0)) return (b.wins || 0) - (a.wins || 0);
      return (b.pointDifferential || 0) - (a.pointDifferential || 0);
    });

  const playerRankIndex = activeParticipant
    ? sortedByRank.findIndex((p) => p.participantId === activeParticipant.participantId)
    : -1;
  const rankDisplay = playerRankIndex >= 0 ? `#${playerRankIndex + 1}` : '—';

  // Matches played by this participant
  const targetId = activeParticipant?.participantId || participantId;
  const playerMatches = targetId
    ? matches.filter(
        (m) =>
          m.status === 'completed' &&
          ((m.teamA || []).includes(targetId) || (m.teamB || []).includes(targetId))
      )
    : [];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImage(true);
    setError(null);
    try {
      const dataUrl = await profileService.processImageFile(file, 320, 0.88);
      setAvatarUrl(dataUrl);
    } catch (err: any) {
      setError(err?.message || 'Could not process the selected image.');
    } finally {
      setIsProcessingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanFirst = firstName.trim();
    const cleanSurname = surname.trim();

    const updatedProfile = updateProfile({
      firstName: cleanFirst,
      surname: cleanSurname,
      skillLevel,
      avatarUrl,
    });

    // If currently inside an active session, sync avatar, skillLevel, and profile to Firestore
    const effParticipantId = activeParticipant?.participantId || participantId;
    if (sessionId && effParticipantId) {
      try {
        const fullName = `${cleanFirst} ${cleanSurname}`.trim() || undefined;
        await updateParticipantProfile(sessionId, effParticipantId, {
          name: fullName,
          firstName: cleanFirst || undefined,
          surname: cleanSurname || undefined,
          skillLevel,
          avatarUrl,
        });
      } catch (err) {
        console.warn('Could not sync profile to live session:', err);
      }
    }

    firePickleballBurst(window.innerWidth / 2, window.innerHeight / 2);
    setSavedSuccess(true);

    if (onSaved) {
      onSaved(updatedProfile);
    }

    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  const initials = firstName
    ? `${firstName.charAt(0)}${surname.charAt(0) || ''}`.toUpperCase()
    : (activeParticipant?.name?.slice(0, 2).toUpperCase() || 'P');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="clay-card rounded-3xl max-w-md w-full bg-white overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-black text-base text-white tracking-tight leading-tight">
                Player Profile & Standings
              </h2>
              <p className="text-[11px] text-emerald-100 font-medium">
                Edit category, profile details & review session record
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-all cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700">
              {error}
            </div>
          )}

          {/* If participant is in session: LIVE SESSION STANDING CARD */}
          {activeParticipant && (
            <div className="clay-subcard rounded-2xl p-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md border border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>Session Standing</span>
                </span>
                <span className="font-mono font-black text-xs px-2 py-0.5 rounded-lg bg-amber-400/20 text-amber-300">
                  Rank {rankDisplay}
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono border-t border-slate-700/80 pt-2.5">
                <div>
                  <span className="text-[9px] text-slate-400 block font-sans font-bold">GAMES</span>
                  <span className="font-black text-white text-sm">{activeParticipant.gamesPlayed || 0}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block font-sans font-bold">RECORD</span>
                  <span className="font-bold text-emerald-400 text-xs">
                    {activeParticipant.wins || 0}W - {activeParticipant.losses || 0}L
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block font-sans font-bold">WIN %</span>
                  <span className="font-black text-amber-300 text-sm">{activeParticipant.winRate || 0}%</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block font-sans font-bold">DIFF</span>
                  <span className="font-bold text-slate-200 text-xs">
                    {(activeParticipant.pointDifferential || 0) >= 0
                      ? `+${activeParticipant.pointDifferential || 0}`
                      : activeParticipant.pointDifferential || 0}
                  </span>
                </div>
              </div>

              {activeParticipant.lockedPartnerName && (
                <div className="mt-2.5 pt-2 border-t border-slate-700/80 text-[10px] text-amber-300 font-bold flex items-center gap-1">
                  <span>🔒 Locked Partner:</span>
                  <span className="text-white font-black">{activeParticipant.lockedPartnerName}</span>
                </div>
              )}
            </div>
          )}

          {/* Photo Upload Area */}
          <div className="text-center space-y-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
              Player Photo / Picture
            </span>

            <div className="flex flex-col items-center justify-center">
              <div className="relative group">
                <div
                  className="w-24 h-24 rounded-3xl overflow-hidden clay-card p-1.5 bg-white flex items-center justify-center transition-all group-hover:scale-102"
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar preview"
                      className="w-full h-full object-cover rounded-2xl"
                    />
                  ) : initials ? (
                    <div className="w-full h-full rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-black text-2xl flex items-center justify-center shadow-inner">
                      {initials}
                    </div>
                  ) : (
                    <div className="w-full h-full rounded-2xl bg-slate-100 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-300">
                      <User className="w-8 h-8 text-slate-400" />
                    </div>
                  )}

                  {isProcessingImage && (
                    <div className="absolute inset-0 bg-slate-900/60 rounded-3xl flex items-center justify-center text-white text-xs font-bold">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {/* Floating Upload Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md border-2 border-white transition-all cursor-pointer"
                  title="Upload picture"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1 rounded-xl clay-btn clay-btn-secondary text-[11px] font-black text-slate-700 flex items-center gap-1"
                >
                  <Upload className="w-3 h-3 text-emerald-600" />
                  <span>Upload Picture</span>
                </button>

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="px-3 py-1 rounded-xl clay-btn clay-btn-secondary text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Name & Surname */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Alex"
                className="w-full px-3.5 py-2.5 rounded-2xl clay-inset text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                Surname
              </label>
              <input
                type="text"
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                placeholder="e.g. Henderson"
                className="w-full px-3.5 py-2.5 rounded-2xl clay-inset text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-emerald-500"
              />
            </div>
          </div>

          {/* Category / Skill Level Selection (Beginner / Intermediate / Advanced) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                Category / Skill Tier
              </label>
              <span className="text-[10px] text-slate-400 font-medium">
                Used to balance doubles courts
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(['beginner', 'intermediate', 'advanced'] as SkillLevel[]).map((level) => {
                const isSelected = skillLevel === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setSkillLevel(level)}
                    className={`py-2 rounded-2xl capitalize text-xs font-black transition-all clay-btn cursor-pointer ${
                      isSelected
                        ? level === 'beginner'
                          ? 'clay-btn-secondary text-sky-800 ring-2 ring-sky-500'
                          : level === 'intermediate'
                          ? 'clay-btn-primary text-white shadow-md'
                          : 'clay-btn-amber text-white shadow-md'
                        : 'clay-btn-secondary text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Player Match History Snippet */}
          {playerMatches.length > 0 && (
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 block mb-2">
                Recent Matches In Session ({playerMatches.length})
              </span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {playerMatches.slice(0, 5).map((pm) => {
                  const isA = (pm.teamA || []).includes(targetId!);
                  const isWin = isA ? pm.winningTeam === 'teamA' : pm.winningTeam === 'teamB';
                  const score = pm.score ? `${pm.score.teamA} - ${pm.score.teamB}` : 'Finished';
                  return (
                    <div
                      key={pm.matchId}
                      className={`p-2 rounded-xl text-xs flex items-center justify-between border ${
                        isWin
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-sm ${
                            isWin ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-800'
                          }`}
                        >
                          {isWin ? 'W' : 'L'}
                        </span>
                        <span className="font-bold text-[11px]">{pm.courtName || 'Court'}</span>
                      </div>
                      <span className="font-mono text-xs">{score}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2">
            <button
              type="submit"
              className={`w-full py-3.5 rounded-2xl text-xs font-black transition-all clay-btn flex items-center justify-center gap-2 cursor-pointer ${
                savedSuccess ? 'bg-emerald-600 text-white' : 'clay-btn-primary text-white shadow-lg'
              }`}
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Profile & Category Saved!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Save Profile & Category</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
