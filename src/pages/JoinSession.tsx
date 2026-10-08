import React, { useState, useEffect } from 'react';
import { useSession } from '../context/SessionContext';
import { useAuth } from '../context/AuthContext';
import { SkillLevel } from '../types';
import { joinSessionAsParticipant } from '../services/sessions/sessionService';
import { BrandLogo } from '../components/ui/BrandLogo';
import { ArrowRight, UserCheck, AlertCircle } from 'lucide-react';

interface JoinSessionProps {
  onJoinSuccess: () => void;
  onBackToHome: () => void;
}

export const JoinSession: React.FC<JoinSessionProps> = ({
  onJoinSuccess,
  onBackToHome,
}) => {
  const { session, participants, setCurrentParticipantId } = useSession();
  const { signInAsAnonymousPlayer } = useAuth();

  const [name, setName] = useState('');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('intermediate');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [existingMatch, setExistingMatch] = useState<any | null>(null);

  useEffect(() => {
    const savedId = localStorage.getItem('picklequeue_participant_id');
    if (savedId && participants.length > 0) {
      const match = participants.find((p) => p.participantId === savedId && p.status !== 'left');
      if (match) {
        setExistingMatch(match);
      }
    }
  }, [participants]);

  const handleReconnect = () => {
    if (existingMatch) {
      setCurrentParticipantId(existingMatch.participantId);
      onJoinSuccess();
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !session) return;

    setIsJoining(true);
    setError(null);

    try {
      await signInAsAnonymousPlayer();

      const newParticipant = await joinSessionAsParticipant(session.id, {
        name: name.trim(),
        skillLevel,
      });

      setCurrentParticipantId(newParticipant.participantId);
      onJoinSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to join session queue.');
    } finally {
      setIsJoining(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="clay-card rounded-3xl p-6 text-center">
          <p className="text-sm font-bold text-slate-700">Loading session information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between max-w-md mx-auto p-4 sm:p-6">
      {/* Top Header */}
      <header className="py-4 text-center">
        <div className="flex justify-center mb-3">
          <BrandLogo size="lg" />
        </div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight">PickleQueue</h1>
        <p className="text-xs text-slate-500 font-medium">Live Court Queue System</p>
      </header>

      {/* Main Join Card (Claymorphism) */}
      <main className="clay-card rounded-3xl p-6 sm:p-7 my-auto space-y-5">
        <div>
          <span className="text-[11px] font-black text-emerald-800 bg-emerald-100 px-3 py-1 rounded-xl uppercase tracking-wider clay-pill">
            Open-Play Session
          </span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-2">{session.name}</h2>
          <p className="text-xs text-slate-500 font-medium">{session.venueName} • {session.numberOfCourts} Courts</p>
        </div>

        {/* Reconnect Option if returning participant */}
        {existingMatch && (
          <div className="p-4 clay-subcard rounded-2xl text-left border border-emerald-200">
            <div className="flex items-center gap-2 mb-1">
              <UserCheck className="w-4 h-4 text-emerald-700" />
              <span className="text-xs font-black text-emerald-950">Is this you?</span>
            </div>
            <p className="text-xs text-slate-600 mb-3 font-medium">
              You were previously checked in as <strong>{existingMatch.name}</strong>.
            </p>
            <button
              type="button"
              onClick={handleReconnect}
              className="w-full py-2.5 clay-btn clay-btn-primary rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-xs"
            >
              <span>Reconnect as {existingMatch.name}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Join Form */}
        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
              Enter Your Name
            </label>
            <div className="clay-inset rounded-2xl px-4 py-3">
              <input
                type="text"
                required
                maxLength={50}
                placeholder="e.g. Alex Henderson"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent text-sm font-bold text-slate-900 focus:outline-hidden placeholder:text-slate-400 placeholder:font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
              Skill Level
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {(['beginner', 'intermediate', 'advanced'] as SkillLevel[]).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setSkillLevel(lvl)}
                  className={`py-3 text-xs font-black rounded-2xl capitalize transition-all clay-btn ${
                    skillLevel === lvl
                      ? 'clay-btn-primary shadow-md'
                      : 'clay-btn-secondary text-slate-700'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isJoining || !name.trim()}
              className="w-full py-4 clay-btn clay-btn-primary rounded-2xl text-sm font-black shadow-lg flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <span>{isJoining ? 'Checking in...' : 'Join Queue'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </main>

      <footer className="text-center py-4">
        <button
          onClick={onBackToHome}
          className="text-xs text-slate-500 hover:text-slate-800 font-bold"
        >
          Cancel & Return Home
        </button>
      </footer>
    </div>
  );
};
