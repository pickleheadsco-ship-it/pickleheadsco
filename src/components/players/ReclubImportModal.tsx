import React, { useState } from 'react';
import { SkillLevel } from '../../types';
import { bulkImportDetailedParticipants } from '../../services/sessions/sessionService';
import {
  Link2,
  X,
  Download,
  Check,
  AlertCircle,
  Users,
  Sparkles,
  ExternalLink,
  ClipboardCheck,
} from 'lucide-react';

interface ParsedPlayer {
  id: string;
  name: string;
  firstName: string;
  surname: string;
  skillLevel: SkillLevel;
  selected: boolean;
  avatarUrl?: string;
  originalText?: string;
}

interface ReclubImportModalProps {
  sessionId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReclubImportModal: React.FC<ReclubImportModalProps> = ({
  sessionId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [reclubUrl, setReclubUrl] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [showPasteFallback, setShowPasteFallback] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedPlayers, setParsedPlayers] = useState<ParsedPlayer[]>([]);
  const [defaultSkill, setDefaultSkill] = useState<SkillLevel>('intermediate');
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);

  if (!isOpen) return null;

  // Helper to parse player names & ratings from text lines or URL query/data
  const parseRawPlayerStrings = (lines: string[]): ParsedPlayer[] => {
    const results: ParsedPlayer[] = [];

    for (const rawLine of lines) {
      let line = rawLine.trim();
      if (!line) continue;

      // Ignore common header strings from Reclub pages
      if (
        line.toLowerCase().startsWith('attendees') ||
        line.toLowerCase().startsWith('members') ||
        line.toLowerCase().startsWith('waitlist') ||
        line.toLowerCase().startsWith('player list') ||
        line.toLowerCase().startsWith('event date') ||
        line.toLowerCase().startsWith('host') ||
        line.toLowerCase().startsWith('pickleball')
      ) {
        continue;
      }

      // Check for skill level indicators in name (e.g. "John Doe (Beginner)" or "3.5" or "[Adv]")
      let detectedSkill: SkillLevel = defaultSkill;
      if (/(beg|beginner|1\.|2\.|2\.5|novice)/i.test(line)) {
        detectedSkill = 'beginner';
      } else if (/(adv|advanced|4\.|4\.5|5\.|pro)/i.test(line)) {
        detectedSkill = 'advanced';
      } else if (/(int|intermediate|3\.|3\.5)/i.test(line)) {
        detectedSkill = 'intermediate';
      }

      // Clean out brackets, numbers, ratings e.g. "(3.5)", "- Beginner", "#1", "[Member]"
      let cleanName = line
        .replace(/\([^\)]*\)/g, '')
        .replace(/\[[^\]]*\]/g, '')
        .replace(/^\d+[\.\-\)]\s*/, '')
        .replace(/[-–]\s*(beginner|intermediate|advanced|pro|novice).*/i, '')
        .replace(/\s{2,}/g, ' ')
        .trim();

      if (cleanName.length < 2) continue;

      const parts = cleanName.split(/\s+/);
      const firstName = parts[0] || cleanName;
      const surname = parts.slice(1).join(' ') || '';

      results.push({
        id: `reclub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: cleanName,
        firstName,
        surname,
        skillLevel: detectedSkill,
        selected: true,
        originalText: line,
      });
    }

    return results;
  };

  const handleParseUrlOrText = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsParsing(true);
    setImportSummary(null);

    try {
      const trimmedUrl = reclubUrl.trim();
      let linesToParse: string[] = [];

      if (!trimmedUrl && !pasteText.trim()) {
        setError('Please paste a Reclub event or club URL, or paste attendee names.');
        setIsParsing(false);
        return;
      }

      // If user pasted raw attendee list or HTML in the box
      if (pasteText.trim()) {
        linesToParse = pasteText.split(/[\r\n]+/);
      } else if (trimmedUrl) {
        // Attempt to extract event ID or slug from Reclub URL
        // e.g. https://reclub.co/events/xyz123 or https://app.reclub.co/m/pickleball...
        try {
          const urlObj = new URL(trimmedUrl.startsWith('http') ? trimmedUrl : `https://${trimmedUrl}`);
          const pathSegments = urlObj.pathname.split('/').filter(Boolean);
          const eventId = pathSegments[pathSegments.length - 1] || 'event';

          // Try fetching attendee data or page via CORS-friendly endpoint
          // In web browsers, Reclub requires authorization for deep scrape, so we do an optimistic fetch
          // and if CORS restricts it, we extract slug details and provide the instant 1-click roster paste
          try {
            const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(urlObj.href)}`);
            if (res.ok) {
              const data = await res.json();
              if (data?.contents) {
                // Parse attendee text from contents
                const rawContents = data.contents;
                const matches = rawContents.match(/([A-Z][a-z]+ [A-Z][a-z]+)/g);
                if (matches && matches.length >= 2) {
                  // Filter out common UI labels
                  const matchArray = Array.from(new Set(matches)) as string[];
                  const filtered = matchArray.filter(
                    (m: string) => !['Privacy Policy', 'Terms Service', 'Sign In', 'Open Play', 'Event Details'].includes(m)
                  );
                  if (filtered.length > 0) {
                    linesToParse = filtered;
                  }
                }
              }
            }
          } catch (fetchErr) {
            console.log('Direct URL fetch fallback to link parser:', fetchErr);
          }

          if (linesToParse.length === 0) {
            // If the URL couldn't be scraped directly due to Reclub authentication / CORS,
            // open the attendee roster paste assistant immediately with clear instructions
            setShowPasteFallback(true);
            setError(
              `Connected to Reclub event (${eventId}). Because Reclub requires login to view private attendee rosters, please copy & paste the attendee list below, or paste player names directly!`
            );
            setIsParsing(false);
            return;
          }
        } catch (urlErr) {
          setError('Invalid URL format. Please enter a valid Reclub link.');
          setIsParsing(false);
          return;
        }
      }

      const parsed = parseRawPlayerStrings(linesToParse);
      if (parsed.length === 0) {
        setError('No player names detected. Please paste the list of attendee names.');
        setShowPasteFallback(true);
      } else {
        setParsedPlayers(parsed);
      }
    } catch (err: any) {
      setError(err?.message || 'Error parsing Reclub link.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleToggleSelectAll = (select: boolean) => {
    setParsedPlayers((prev) => prev.map((p) => ({ ...p, selected: select })));
  };

  const handleTogglePlayer = (id: string) => {
    setParsedPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p))
    );
  };

  const handleChangePlayerSkill = (id: string, skill: SkillLevel) => {
    setParsedPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, skillLevel: skill } : p))
    );
  };

  const handleApplyDefaultSkillToAll = (skill: SkillLevel) => {
    setDefaultSkill(skill);
    setParsedPlayers((prev) => prev.map((p) => ({ ...p, skillLevel: skill })));
  };

  const handleImportSelected = async () => {
    const selected = parsedPlayers.filter((p) => p.selected);
    if (selected.length === 0) {
      setError('Please select at least one player to import.');
      return;
    }

    setIsImporting(true);
    setError(null);
    try {
      const toAdd = selected.map((p) => ({
        name: p.name,
        firstName: p.firstName,
        surname: p.surname,
        skillLevel: p.skillLevel,
      }));

      const addedCount = await bulkImportDetailedParticipants(sessionId, toAdd);
      setImportSummary(`Successfully imported ${addedCount} players from Reclub into the queue!`);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 900);
    } catch (err: any) {
      setError(err?.message || 'Failed to import players to session.');
    } finally {
      setIsImporting(false);
    }
  };

  const selectedCount = parsedPlayers.filter((p) => p.selected).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="clay-card rounded-3xl max-w-xl w-full bg-white max-h-[92dvh] overflow-y-auto p-5 sm:p-6 shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-base sm:text-lg">
                  Import Players from Reclub
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                  URL Import
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Sync attendee roster directly into PickleQueue
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
          <div className="mt-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{error}</div>
          </div>
        )}

        {importSummary && (
          <div className="mt-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{importSummary}</span>
          </div>
        )}

        {/* Form: URL Input */}
        <form onSubmit={handleParseUrlOrText} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
              Reclub Event or Club URL
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={reclubUrl}
                  onChange={(e) => setReclubUrl(e.target.value)}
                  placeholder="https://reclub.co/events/xyz or https://reclub.co/clubs/..."
                  className="w-full px-3.5 py-2.5 rounded-2xl clay-inset text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-emerald-500 pr-8"
                />
                <ExternalLink className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
              <button
                type="submit"
                disabled={isParsing}
                className="px-4 py-2.5 rounded-2xl clay-btn clay-btn-primary text-white text-xs font-black flex items-center gap-1.5 shrink-0 shadow-md cursor-pointer disabled:opacity-50"
              >
                {isParsing ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>Fetch Roster</span>
              </button>
            </div>
          </div>

          {/* Fallback / Paste Area Accordion */}
          <div>
            <button
              type="button"
              onClick={() => setShowPasteFallback(!showPasteFallback)}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5 underline decoration-emerald-300"
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>
                {showPasteFallback
                  ? 'Hide manual attendee paste box'
                  : 'Or paste Reclub attendee list / names directly'}
              </span>
            </button>

            {showPasteFallback && (
              <div className="mt-2.5 space-y-2 animate-in fade-in duration-150">
                <p className="text-[11px] text-slate-500 font-medium">
                  Copy the attendee list from Reclub (web or app) and paste here. Levels like
                  (Beginner / Intermediate / 3.5) will be automatically detected!
                </p>
                <textarea
                  rows={4}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="e.g.&#10;Sarah Miller (Intermediate)&#10;David Kim - Beginner&#10;Alex Henderson [3.5]&#10;Rachel Adams"
                  className="w-full p-3 rounded-2xl clay-inset text-xs font-mono font-medium text-slate-800 placeholder-slate-400 focus:outline-emerald-500"
                />
                <button
                  type="submit"
                  disabled={isParsing}
                  className="py-2 px-4 rounded-xl clay-btn clay-btn-secondary text-xs font-black text-slate-800 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Parse Pasted Attendee List</span>
                </button>
              </div>
            )}
          </div>
        </form>

        {/* Parsed Players Preview Table */}
        {parsedPlayers.length > 0 && (
          <div className="mt-6 border-t border-slate-100 pt-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <h4 className="font-black text-slate-900 text-sm">
                  Parsed Players ({parsedPlayers.length})
                </h4>
                <span className="text-xs text-slate-500 font-bold">
                  ({selectedCount} selected)
                </span>
              </div>

              {/* Bulk Skill Selector */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[10px] text-slate-500 font-black uppercase">Set All:</span>
                {(['beginner', 'intermediate', 'advanced'] as SkillLevel[]).map((sk) => (
                  <button
                    key={sk}
                    type="button"
                    onClick={() => handleApplyDefaultSkillToAll(sk)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-black capitalize clay-btn ${
                      defaultSkill === sk
                        ? 'clay-btn-primary text-white'
                        : 'clay-btn-secondary text-slate-600'
                    }`}
                  >
                    {sk}
                  </button>
                ))}
              </div>
            </div>

            {/* Selection Quick Buttons */}
            <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
              <button
                type="button"
                onClick={() => handleToggleSelectAll(true)}
                className="hover:text-emerald-700 underline"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={() => handleToggleSelectAll(false)}
                className="hover:text-rose-700 underline"
              >
                Deselect All
              </button>
            </div>

            {/* Player list scrollable */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {parsedPlayers.map((player) => (
                <div
                  key={player.id}
                  className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-2 ${
                    player.selected
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}
                >
                  <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={player.selected}
                      onChange={() => handleTogglePlayer(player.id)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div className="w-7 h-7 rounded-full bg-emerald-700 text-white flex items-center justify-center font-black text-xs shrink-0">
                      {player.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <span className="font-black text-xs text-slate-900 block truncate">
                        {player.name}
                      </span>
                      {player.originalText && player.originalText !== player.name && (
                        <span className="text-[10px] text-slate-400 font-mono block truncate">
                          {player.originalText}
                        </span>
                      )}
                    </div>
                  </label>

                  {/* Category / Skill Selector Dropdown */}
                  <select
                    value={player.skillLevel}
                    onChange={(e) => handleChangePlayerSkill(player.id, e.target.value as SkillLevel)}
                    className="clay-inset rounded-xl px-2 py-1 text-xs font-black text-slate-800 bg-white cursor-pointer focus:outline-emerald-500"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              ))}
            </div>

            {/* Import Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleImportSelected}
                disabled={isImporting || selectedCount === 0}
                className="w-full py-3.5 rounded-2xl clay-btn clay-btn-primary text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
              >
                {isImporting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Import {selectedCount} Players to Session Queue</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
