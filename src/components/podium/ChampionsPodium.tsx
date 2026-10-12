import React from 'react';
import { Participant } from '../../types';
import { SkillBadge } from '../ui/Badge';
import { Trophy, Award, Flame, Star, Sparkles } from 'lucide-react';

interface ChampionsPodiumProps {
  participants: Participant[];
  className?: string;
  onSelectPlayer?: (player: Participant) => void;
}

/**
 * Enhanced Champions Podium:
 * Displays the top 3 performers standing on a 3D tournament pedestal with their picture
 * and pickleball paddle holding their medal (Gold 1st, Silver 2nd, Bronze 3rd).
 */
export const ChampionsPodium: React.FC<ChampionsPodiumProps> = ({
  participants,
  className = '',
  onSelectPlayer,
}) => {
  // Sort participants by win rate descending, then total wins, then point differential
  const activePlayers = participants.filter((p) => (p.gamesPlayed || 0) > 0);
  const sorted = [...activePlayers].sort((a, b) => {
    if ((b.winRate || 0) !== (a.winRate || 0)) return (b.winRate || 0) - (a.winRate || 0);
    if ((b.wins || 0) !== (a.wins || 0)) return (b.wins || 0) - (a.wins || 0);
    return (b.pointDifferential || 0) - (a.pointDifferential || 0);
  });

  if (sorted.length < 1) {
    return (
      <div className={`clay-card rounded-3xl p-8 text-center text-slate-500 ${className}`}>
        <Trophy className="w-10 h-10 text-amber-400 mx-auto mb-2 opacity-60" />
        <p className="text-sm font-black text-slate-800">No Match Results Yet</p>
        <p className="text-xs text-slate-500 font-medium mt-1">
          Complete matches on court to see the champions take the podium!
        </p>
      </div>
    );
  }

  const firstPlace = sorted[0] || null;
  const secondPlace = sorted[1] || null;
  const thirdPlace = sorted[2] || null;

  return (
    <div
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 text-white p-5 sm:p-8 shadow-2xl border border-slate-700/80 ${className}`}
    >
      {/* Decorative Sparkles & Ambient Glow */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-10 left-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute top-10 right-10 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Podium Header */}
      <div className="text-center relative z-10 mb-8 sm:mb-12">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] sm:text-xs font-black tracking-widest uppercase mb-2 shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
          <span>Session Champions Podium</span>
          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-md">
          Top Performers
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-sm mx-auto mt-1">
          Standing tall on the winner’s stand with their paddles and championship medals
        </p>
      </div>

      {/* 3D Stepped Podium Grid */}
      <div className="relative z-10 max-w-2xl mx-auto grid grid-cols-3 gap-2 sm:gap-6 items-end pt-4 sm:pt-8">
        {/* ========================================================= */}
        {/* 2ND PLACE (SILVER) - LEFT COLUMN                          */}
        {/* ========================================================= */}
        <div className="flex flex-col items-center">
          {secondPlace ? (
            <div
              onClick={() => onSelectPlayer && onSelectPlayer(secondPlace)}
              className="w-full flex flex-col items-center cursor-pointer transition-transform hover:-translate-y-1 group"
            >
              {/* Silver Medal Badge & Paddle Graphic */}
              <div className="relative mb-3 flex flex-col items-center">
                {/* Pickleball Paddle graphic holding medal */}
                <div className="relative">
                  {/* Paddle illustration */}
                  <div className="w-16 h-20 sm:w-20 sm:h-24 rounded-2xl bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 p-1 shadow-lg border-2 border-slate-100 flex flex-col items-center justify-between relative overflow-hidden group-hover:scale-105 transition-all">
                    {/* Paddle honeycomb face texture */}
                    <div className="w-full h-full bg-slate-700/80 rounded-xl p-1 flex flex-col items-center justify-center relative">
                      {/* Player photo standing on paddle face */}
                      <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full overflow-hidden border-2 border-slate-300 shadow-md bg-slate-800 flex items-center justify-center">
                        {secondPlace.avatarUrl ? (
                          <img
                            src={secondPlace.avatarUrl}
                            alt={secondPlace.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="font-black text-slate-200 text-xs sm:text-base">
                            {secondPlace.name?.slice(0, 2).toUpperCase() || 'P2'}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Paddle grip handle */}
                    <div className="w-3 sm:w-4 h-3 bg-slate-900 border-t border-slate-400 rounded-b-sm" />
                  </div>

                  {/* Silver Medal draped over paddle */}
                  <div className="absolute -bottom-2 -right-2 bg-gradient-to-br from-slate-100 to-slate-300 text-slate-900 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-black text-xs sm:text-sm shadow-xl border-2 border-white ring-2 ring-slate-400">
                    🥈
                  </div>
                </div>
              </div>

              {/* Player Info */}
              <div className="text-center w-full px-1 mb-2">
                <div className="font-black text-xs sm:text-sm text-slate-100 truncate group-hover:text-white">
                  {secondPlace.name}
                </div>
                <div className="text-[10px] text-slate-400 font-mono font-bold mt-0.5">
                  <span className="text-emerald-400 font-black">{secondPlace.winRate}%</span> Win Rate
                </div>
                <div className="text-[9px] sm:text-[10px] text-slate-400 font-semibold">
                  {secondPlace.wins}W - {secondPlace.losses}L
                </div>
              </div>

              {/* Pedestal Step 2 */}
              <div className="w-full h-24 sm:h-32 rounded-t-2xl bg-gradient-to-t from-slate-800 via-slate-700 to-slate-600 border-t-4 border-slate-300 flex flex-col items-center justify-start pt-3 shadow-inner relative overflow-hidden">
                <span className="font-black text-2xl sm:text-4xl text-slate-300/80 font-mono drop-shadow-sm">
                  2
                </span>
                <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-slate-300 mt-1">
                  Silver
                </span>
              </div>
            </div>
          ) : (
            <div className="w-full h-32 rounded-t-2xl bg-slate-800/50 border-t-2 border-slate-700 flex items-center justify-center text-xs text-slate-600 font-bold">
              2nd Place
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* 1ST PLACE (GOLD) - CENTER COLUMN (TALLEST)                */}
        {/* ========================================================= */}
        <div className="flex flex-col items-center -mt-6 sm:-mt-10">
          {firstPlace ? (
            <div
              onClick={() => onSelectPlayer && onSelectPlayer(firstPlace)}
              className="w-full flex flex-col items-center cursor-pointer transition-transform hover:-translate-y-1 group"
            >
              {/* Crown / Trophy Sparkle Header */}
              <div className="relative mb-3 flex flex-col items-center">
                {/* Crown over 1st place */}
                <div className="mb-1 text-amber-300 flex items-center gap-1 animate-bounce">
                  <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                  <Trophy className="w-6 h-6 text-amber-400 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                  <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                </div>

                {/* Golden Pickleball Paddle graphic holding Gold Medal */}
                <div className="relative">
                  <div className="w-20 h-24 sm:w-24 sm:h-30 rounded-2xl bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-500 p-1.5 shadow-2xl border-2 border-yellow-200 flex flex-col items-center justify-between relative overflow-hidden group-hover:scale-105 transition-all ring-4 ring-amber-400/40">
                    {/* Paddle honeycomb face */}
                    <div className="w-full h-full bg-slate-900 rounded-xl p-1 flex flex-col items-center justify-center relative shadow-inner">
                      {/* Player photo standing on 1st place paddle */}
                      <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-full overflow-hidden border-2 border-amber-300 shadow-xl bg-slate-800 flex items-center justify-center ring-2 ring-amber-400/60">
                        {firstPlace.avatarUrl ? (
                          <img
                            src={firstPlace.avatarUrl}
                            alt={firstPlace.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="font-black text-amber-300 text-base sm:text-xl">
                            {firstPlace.name?.slice(0, 2).toUpperCase() || 'P1'}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Paddle grip handle with gold tape */}
                    <div className="w-4 sm:w-5 h-3.5 bg-amber-950 border-t border-amber-400 rounded-b-sm" />
                  </div>

                  {/* Gold Medal draped over paddle */}
                  <div className="absolute -bottom-3 -right-3 bg-gradient-to-br from-yellow-300 to-amber-500 text-slate-950 w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center font-black text-sm sm:text-base shadow-2xl border-2 border-yellow-100 ring-4 ring-amber-400 animate-pulse">
                    🥇
                  </div>
                </div>
              </div>

              {/* Player Info */}
              <div className="text-center w-full px-1 mb-2">
                <div className="font-black text-sm sm:text-base text-yellow-300 truncate group-hover:text-yellow-200 drop-shadow-sm">
                  {firstPlace.name}
                </div>
                <div className="text-[11px] sm:text-xs text-slate-200 font-mono font-black mt-0.5">
                  <span className="text-emerald-300">{firstPlace.winRate}%</span> Win Rate
                </div>
                <div className="text-[10px] sm:text-[11px] text-slate-300 font-bold">
                  {firstPlace.wins}W - {firstPlace.losses}L ({firstPlace.gamesPlayed} Games)
                </div>
                {typeof firstPlace.pointDifferential === 'number' && (
                  <div className="text-[9px] text-emerald-400 font-mono font-bold mt-0.5">
                    {firstPlace.pointDifferential >= 0 ? `+${firstPlace.pointDifferential}` : firstPlace.pointDifferential} Point Diff
                  </div>
                )}
              </div>

              {/* Pedestal Step 1 (Tallest) */}
              <div className="w-full h-32 sm:h-44 rounded-t-2xl bg-gradient-to-t from-amber-950 via-amber-800 to-amber-600 border-t-4 border-yellow-300 flex flex-col items-center justify-start pt-3 sm:pt-4 shadow-2xl relative overflow-hidden ring-1 ring-amber-400/40">
                <span className="font-black text-4xl sm:text-6xl text-amber-200 font-mono drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                  1
                </span>
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-amber-200 mt-1">
                  Champion
                </span>
              </div>
            </div>
          ) : (
            <div className="w-full h-44 rounded-t-2xl bg-slate-800/50 border-t-2 border-slate-700 flex items-center justify-center text-xs text-slate-600 font-bold">
              1st Place
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* 3RD PLACE (BRONZE) - RIGHT COLUMN                         */}
        {/* ========================================================= */}
        <div className="flex flex-col items-center">
          {thirdPlace ? (
            <div
              onClick={() => onSelectPlayer && onSelectPlayer(thirdPlace)}
              className="w-full flex flex-col items-center cursor-pointer transition-transform hover:-translate-y-1 group"
            >
              {/* Bronze Medal Badge & Paddle Graphic */}
              <div className="relative mb-3 flex flex-col items-center">
                <div className="relative">
                  <div className="w-16 h-20 sm:w-20 sm:h-24 rounded-2xl bg-gradient-to-br from-amber-700 via-amber-800 to-amber-900 p-1 shadow-lg border-2 border-amber-600 flex flex-col items-center justify-between relative overflow-hidden group-hover:scale-105 transition-all">
                    {/* Paddle face */}
                    <div className="w-full h-full bg-slate-800/90 rounded-xl p-1 flex flex-col items-center justify-center relative">
                      {/* Player photo */}
                      <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full overflow-hidden border-2 border-amber-700 shadow-md bg-slate-800 flex items-center justify-center">
                        {thirdPlace.avatarUrl ? (
                          <img
                            src={thirdPlace.avatarUrl}
                            alt={thirdPlace.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="font-black text-amber-200 text-xs sm:text-base">
                            {thirdPlace.name?.slice(0, 2).toUpperCase() || 'P3'}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Handle */}
                    <div className="w-3 sm:w-4 h-3 bg-amber-950 border-t border-amber-700 rounded-b-sm" />
                  </div>

                  {/* Bronze Medal */}
                  <div className="absolute -bottom-2 -right-2 bg-gradient-to-br from-amber-600 to-amber-800 text-amber-100 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-black text-xs sm:text-sm shadow-xl border-2 border-amber-400 ring-2 ring-amber-700">
                    🥉
                  </div>
                </div>
              </div>

              {/* Player Info */}
              <div className="text-center w-full px-1 mb-2">
                <div className="font-black text-xs sm:text-sm text-slate-100 truncate group-hover:text-white">
                  {thirdPlace.name}
                </div>
                <div className="text-[10px] text-slate-400 font-mono font-bold mt-0.5">
                  <span className="text-emerald-400 font-black">{thirdPlace.winRate}%</span> Win Rate
                </div>
                <div className="text-[9px] sm:text-[10px] text-slate-400 font-semibold">
                  {thirdPlace.wins}W - {thirdPlace.losses}L
                </div>
              </div>

              {/* Pedestal Step 3 */}
              <div className="w-full h-20 sm:h-28 rounded-t-2xl bg-gradient-to-t from-slate-900 via-amber-950 to-amber-900 border-t-4 border-amber-700 flex flex-col items-center justify-start pt-3 shadow-inner relative overflow-hidden">
                <span className="font-black text-2xl sm:text-4xl text-amber-400/80 font-mono drop-shadow-sm">
                  3
                </span>
                <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-amber-300 mt-1">
                  Bronze
                </span>
              </div>
            </div>
          ) : (
            <div className="w-full h-28 rounded-t-2xl bg-slate-800/50 border-t-2 border-slate-700 flex items-center justify-center text-xs text-slate-600 font-bold">
              3rd Place
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
