import React, { useState } from 'react';
import { Participant, Court, GroupMatchProposal } from '../../types';
import { SkillBadge } from '../ui/Badge';
import { buildManualMatchProposal } from '../../services/matching/matchingEngine';
import { X, Shuffle, Play, Users } from 'lucide-react';

interface ManualMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableCourts: Court[];
  availableParticipants: Participant[];
  preSelectedIds?: string[];
  onStartMatch: (court: Court, proposal: GroupMatchProposal) => Promise<void>;
}

export const ManualMatchModal: React.FC<ManualMatchModalProps> = ({
  isOpen,
  onClose,
  availableCourts,
  availableParticipants,
  preSelectedIds = [],
  onStartMatch,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(preSelectedIds);
  const [selectedCourtId, setSelectedCourtId] = useState<string>(availableCourts[0]?.courtId || '');
  const [shuffledSeed, setShuffledSeed] = useState(0);
  const [isStarting, setIsStarting] = useState(false);

  if (!isOpen) return null;

  const toggleSelect = (pId: string) => {
    if (selectedIds.includes(pId)) {
      setSelectedIds(selectedIds.filter((id) => id !== pId));
    } else {
      if (selectedIds.length >= 4) return;
      setSelectedIds([...selectedIds, pId]);
    }
  };

  const selectedPlayers = selectedIds
    .map((id) => availableParticipants.find((p) => p.participantId === id))
    .filter(Boolean) as Participant[];

  const proposal = selectedPlayers.length === 4 ? buildManualMatchProposal(selectedPlayers, shuffledSeed > 0) : null;
  const targetCourt = availableCourts.find((c) => c.courtId === selectedCourtId) || availableCourts[0];

  const handleStart = async () => {
    if (!proposal || !targetCourt) return;
    setIsStarting(true);
    try {
      await onStartMatch(targetCourt, proposal);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="clay-card rounded-3xl max-w-xl w-full max-h-[90dvh] overflow-y-auto p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center clay-subcard">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">Manual Match Builder</h3>
              <p className="text-xs text-slate-500 font-medium">Pick 4 players and assign an open court</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl clay-btn clay-btn-secondary flex items-center justify-center text-slate-500" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Player Selection Grid */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700">
              Select 4 Players ({selectedIds.length}/4 chosen)
            </span>
            {selectedIds.length === 4 && (
              <button
                type="button"
                onClick={() => setShuffledSeed((s) => s + 1)}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5 py-1 px-2.5 rounded-xl clay-subcard"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Shuffle Teams</span>
              </button>
            )}
          </div>

          <div className="max-h-52 overflow-y-auto clay-inset rounded-2xl p-1.5 space-y-1">
            {availableParticipants.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 font-medium">
                No waiting players available to select right now.
              </div>
            ) : (
              availableParticipants.map((p) => {
                const isSelected = selectedIds.includes(p.participantId);
                return (
                  <div
                    key={p.participantId}
                    onClick={() => toggleSelect(p.participantId)}
                    className={`p-2.5 rounded-xl flex items-center justify-between text-xs cursor-pointer transition-all ${
                      isSelected ? 'clay-card ring-2 ring-emerald-500 font-bold text-emerald-950' : 'hover:bg-white/80 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded-lg border-slate-300 text-emerald-600 w-4 h-4 pointer-events-none"
                      />
                      <span>{p.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <SkillBadge skill={p.skillLevel} />
                      <span className="text-slate-400 text-[11px] font-mono font-bold">
                        {p.gamesPlayed}G ({p.wins}W)
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Match Preview */}
        {proposal && (
          <div className="mt-4 clay-subcard p-3.5 rounded-2xl border border-slate-200">
            <div className="text-[11px] font-black text-slate-600 uppercase tracking-wider mb-2">
              Team Preview (Skill Delta: {proposal.skillDelta})
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-3 rounded-xl clay-pill border border-emerald-200">
                <span className="font-black text-emerald-800 text-[11px] block mb-1">TEAM A</span>
                {proposal.teamA.map((p) => (
                  <div key={p.participantId} className="font-bold text-slate-800 truncate">
                    {p.name} ({p.skillLevel[0].toUpperCase()})
                  </div>
                ))}
              </div>
              <div className="bg-white p-3 rounded-xl clay-pill border border-sky-200">
                <span className="font-black text-sky-800 text-[11px] block mb-1">TEAM B</span>
                {proposal.teamB.map((p) => (
                  <div key={p.participantId} className="font-bold text-slate-800 truncate">
                    {p.name} ({p.skillLevel[0].toUpperCase()})
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Court Target Selector */}
        <div className="mt-4">
          <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
            Assign to Court
          </label>
          <div className="clay-inset rounded-2xl px-3 py-2">
            <select
              value={selectedCourtId}
              onChange={(e) => setSelectedCourtId(e.target.value)}
              className="w-full bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden"
            >
              {availableCourts.length === 0 ? (
                <option disabled>No open courts available</option>
              ) : (
                availableCourts.map((c) => (
                  <option key={c.courtId} value={c.courtId}>
                    {c.name} (Open)
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-2xl clay-btn clay-btn-secondary text-xs font-bold"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={selectedIds.length !== 4 || !targetCourt || isStarting}
            onClick={handleStart}
            className="px-5 py-2.5 rounded-2xl clay-btn clay-btn-primary text-xs font-black shadow-md flex items-center gap-1.5 disabled:opacity-40"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isStarting ? 'Deploying...' : `Start Match on ${targetCourt?.name || 'Court'}`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
