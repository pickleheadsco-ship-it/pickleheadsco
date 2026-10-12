import React, { useState } from 'react';
import { Session } from '../../types';
import { AlertTriangle, X, ShieldAlert } from 'lucide-react';
import { endSession } from '../../services/sessions/sessionService';
import { useAuth } from '../../context/AuthContext';

interface EndSessionModalProps {
  session: Session;
  isOpen: boolean;
  onClose: () => void;
  onCompleted: () => void;
}

export const EndSessionModal: React.FC<EndSessionModalProps> = ({
  session,
  isOpen,
  onClose,
  onCompleted,
}) => {
  const { isAdmin, isOrganizer } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!isAdmin && !isOrganizer) {
      setErrorMsg('Admin Authorization Required: Ending a live session is restricted to administrators only.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await endSession(session.id);
      onCompleted();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'Failed to end session.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="clay-card rounded-3xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center clay-subcard">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">End This Session?</h3>
              <p className="text-xs text-slate-500 font-medium">{session.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl clay-btn clay-btn-secondary flex items-center justify-center text-slate-500" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3 text-xs text-slate-600 leading-relaxed font-medium">
          <p>
            Closing this session stops the active queue, locks new joins, and compiles the final
            standings podium and match records.
          </p>
          <div className="p-3 clay-subcard rounded-2xl text-slate-800 font-bold border border-slate-200/60">
            All player game counts, win rates, and match logs will be permanently preserved.
          </div>

          {!isAdmin && !isOrganizer && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2 font-bold animate-in fade-in">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                Ending an active session is restricted to administrators and authorized organizers only. Mobile players cannot end sessions.
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold animate-in fade-in">
              {errorMsg}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-2xl clay-btn clay-btn-secondary text-xs font-bold"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting || (!isAdmin && !isOrganizer)}
            onClick={handleConfirm}
            className="px-5 py-2.5 rounded-2xl clay-btn clay-btn-danger text-white text-xs font-black shadow-md disabled:opacity-40 cursor-pointer"
          >
            {isSubmitting ? 'Ending...' : 'Yes, End & View Summary'}
          </button>
        </div>
      </div>
    </div>
  );
};
