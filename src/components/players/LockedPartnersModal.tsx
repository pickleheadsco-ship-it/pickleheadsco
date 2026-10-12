import React, { useState } from 'react';
import { Participant, Session } from '../../types';
import { lockPartners, unlockPartners } from '../../services/sessions/sessionService';
import { SkillBadge } from '../ui/Badge';
import {
  Lock,
  Unlock,
  X,
  Users,
  Check,
  AlertCircle,
  Sparkles,
  Link,
  ShieldCheck,
} from 'lucide-react';

interface LockedPartnersModalProps {
  sessionId: string;
  session: Session;
  participants: Participant[];
  isOpen: boolean;
  onClose: () => void;
  preselectedPlayer1Id?: string | null;
}

export const LockedPartnersModal: React.FC<LockedPartnersModalProps> = ({
  sessionId,
  session,
  participants,
  isOpen,
  onClose,
  preselectedPlayer1Id,
}) => {
  const [player1Id, setPlayer1Id] = useState<string>(preselectedPlayer1Id || '');
  const [player2Id, setPlayer2Id] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Active participants list
  const activeParticipants = participants.filter((p) => p.status !== 'left');

  // Currently locked pairs from session or participants
  const existingPairs = session.lockedPartners || [];

  const handleLockPair = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!player1Id || !player2Id) {
      setError('Please select both Player 1 and Player 2 to lock as partners.');
      return;
    }
    if (player1Id === player2Id) {
      setError('Please choose two different players to partner together.');
      return;
    }

    const p1 = participants.find((p) => p.participantId === player1Id);
    const p2 = participants.find((p) => p.participantId === player2Id);
    if (!p1 || !p2) {
      setError('Could not locate the selected players in this session.');
      return;
    }

    setIsSubmitting(true);
    try {
      await lockPartners(
        sessionId,
        { id: p1.participantId, name: p1.name },
        { id: p2.participantId, name: p2.name }
      );
      setSuccessMsg(`Locked ${p1.name} and ${p2.name} as partners! They will be paired together on court.`);
      setPlayer1Id('');
      setPlayer2Id('');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to lock partners.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlockPair = async (id1: string, id2: string) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await unlockPartners(sessionId, id1, id2);
      setSuccessMsg('Partnership unlocked. Players will rotate normally.');
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch (err: any) {
      setError(err?.message || 'Failed to unlock partnership.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const p1Selected = participants.find((p) => p.participantId === player1Id);
  const p2Selected = participants.find((p) => p.participantId === player2Id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="clay-card rounded-3xl max-w-lg w-full bg-white max-h-[92dvh] overflow-y-auto p-5 sm:p-6 shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-base sm:text-lg">
                  Locked-in Partners
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 uppercase tracking-wider">
                  Fixed Doubles
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Pair two players to play on the same team every match
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl clay-btn clay-btn-secondary flex items-center justify-center text-slate-500 hover:text-slate-800"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Existing Locked Partners List */}
        <div className="mt-4">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-amber-600" />
            <span>Active Locked Pairs ({existingPairs.length})</span>
          </h4>

          {existingPairs.length === 0 ? (
            <div className="p-4 rounded-2xl clay-inset text-center text-xs text-slate-500 font-medium">
              No locked-in partnerships yet. Select 2 players below to link them together!
            </div>
          ) : (
            <div className="space-y-2">
              {existingPairs.map((pair, idx) => {
                const player1 = participants.find((p) => p.participantId === pair.id1);
                const player2 = participants.find((p) => p.participantId === pair.id2);

                return (
                  <div
                    key={`${pair.id1}-${pair.id2}-${idx}`}
                    className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
                        <Lock className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-1.5 font-black text-xs text-slate-900 truncate">
                          <span>{pair.player1Name || player1?.name || 'Player 1'}</span>
                          <span className="text-amber-600 font-black">&</span>
                          <span>{pair.player2Name || player2?.name || 'Player 2'}</span>
                        </div>
                        <span className="text-[10px] text-amber-800 font-semibold">
                          Locked Doubles Partners
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUnlockPair(pair.id1, pair.id2)}
                      disabled={isSubmitting}
                      className="px-2.5 py-1.5 rounded-xl clay-btn clay-btn-secondary text-slate-700 text-xs font-bold flex items-center gap-1 hover:text-rose-600 cursor-pointer shrink-0"
                      title="Unlock partners"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Unlock</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Create New Locked Partnership Form */}
        <form onSubmit={handleLockPair} className="mt-6 border-t border-slate-100 pt-5 space-y-4">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
            Create Locked-In Partnership
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Player 1 Select */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Player 1
              </label>
              <select
                value={player1Id}
                onChange={(e) => setPlayer1Id(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl clay-inset text-xs font-bold text-slate-800 focus:outline-emerald-500 bg-white"
              >
                <option value="">-- Choose Player 1 --</option>
                {activeParticipants.map((p) => (
                  <option
                    key={p.participantId}
                    value={p.participantId}
                    disabled={p.participantId === player2Id}
                  >
                    {p.name} ({p.skillLevel}) {p.lockedPartnerId ? '🔒 (Locked)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Player 2 Select */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Player 2 (Partner)
              </label>
              <select
                value={player2Id}
                onChange={(e) => setPlayer2Id(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl clay-inset text-xs font-bold text-slate-800 focus:outline-emerald-500 bg-white"
              >
                <option value="">-- Choose Player 2 --</option>
                {activeParticipants.map((p) => (
                  <option
                    key={p.participantId}
                    value={p.participantId}
                    disabled={p.participantId === player1Id}
                  >
                    {p.name} ({p.skillLevel}) {p.lockedPartnerId ? '🔒 (Locked)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Preview Linked Badge if both selected */}
          {p1Selected && p2Selected && (
            <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xs shadow-xs">
                  🔒
                </div>
                <div>
                  <div className="font-black text-xs text-slate-900">
                    {p1Selected.name} + {p2Selected.name}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <SkillBadge skill={p1Selected.skillLevel} />
                    <span className="text-[10px] text-slate-400 font-bold">+</span>
                    <SkillBadge skill={p2Selected.skillLevel} />
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-black text-amber-800 uppercase px-2 py-0.5 rounded-lg bg-amber-200">
                Ready to Lock
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !player1Id || !player2Id}
            className="w-full py-3.5 rounded-2xl clay-btn clay-btn-amber text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Lock className="w-4 h-4" />
            )}
            <span>Lock In as Permanent Doubles Partners</span>
          </button>
        </form>
      </div>
    </div>
  );
};
