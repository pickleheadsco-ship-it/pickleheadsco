import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
  runTransaction,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import {
  Session,
  Participant,
  Court,
  Match,
  MatchingMode,
  SkillLevel,
  GroupMatchProposal,
  MatchScore,
} from '../../types';

// Helper to generate 6-character alphanumeric join code
export function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid 0/O, 1/I confusion
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export interface CreateSessionParams {
  name: string;
  venueName: string;
  numberOfCourts: number;
  matchingMode: MatchingMode;
  maxPlayers?: number;
  organizerId: string;
  organizerEmail?: string;
  announcementSettings?: {
    enabled: boolean;
    volume: number;
    rate: number;
    pitch: number;
  };
}

export function cacheSessionLocally(session: Session, courts: Court[]) {
  try {
    localStorage.setItem(`picklequeue_session_${session.id}`, JSON.stringify(session));
    localStorage.setItem(`picklequeue_courts_${session.id}`, JSON.stringify(courts));
    const recent = JSON.parse(localStorage.getItem('picklequeue_recent_sessions') || '[]');
    if (!recent.includes(session.id)) {
      recent.unshift(session.id);
      localStorage.setItem('picklequeue_recent_sessions', JSON.stringify(recent.slice(0, 10)));
    }
  } catch (e) {
    console.warn('Could not cache session locally:', e);
  }
}

export function getCachedSession(sessionId: string): { session: Session; courts: Court[] } | null {
  try {
    const rawSession = localStorage.getItem(`picklequeue_session_${sessionId}`);
    const rawCourts = localStorage.getItem(`picklequeue_courts_${sessionId}`);
    if (rawSession) {
      return {
        session: JSON.parse(rawSession),
        courts: rawCourts ? JSON.parse(rawCourts) : [],
      };
    }
  } catch (e) {
    console.warn('Could not read cached session:', e);
  }
  return null;
}

export async function createSession(params: CreateSessionParams): Promise<string> {
  const sessionRef = doc(collection(db, 'sessions'));
  const sessionId = sessionRef.id;
  const joinCode = generateJoinCode();

  const sessionData: Omit<Session, 'id'> = {
    venueId: 'v-default',
    venueName: params.venueName.trim() || 'Community Pickleball Center',
    name: params.name.trim() || 'Friday Night Open Play',
    sport: 'pickleball',
    status: 'active',
    matchingMode: params.matchingMode || 'balanced',
    numberOfCourts: params.numberOfCourts || 3,
    maxPlayers: params.maxPlayers || 60,
    joinCode,
    organizerId: params.organizerId,
    organizerEmail: params.organizerEmail || '',
    announcementSettings: params.announcementSettings || {
      enabled: true,
      volume: 1,
      rate: 1,
      pitch: 1,
    },
    startedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const initialCourts: Court[] = [];
  for (let i = 1; i <= (params.numberOfCourts || 3); i++) {
    initialCourts.push({
      courtId: `court-${i}`,
      name: `Court ${i}`,
      status: 'available',
      currentMatchId: null,
      available: true,
      order: i,
    });
  }

  // Pre-seed local storage immediately so that loading the terminal is instant
  const sessionRecord = { id: sessionId, ...sessionData } as Session;
  cacheSessionLocally(sessionRecord, initialCourts);

  try {
    const batch = writeBatch(db);
    batch.set(sessionRef, sessionData);

    // Seed default courts (Court 1, Court 2, etc.)
    for (let i = 1; i <= (params.numberOfCourts || 3); i++) {
      const courtRef = doc(collection(db, `sessions/${sessionId}/courts`));
      const courtData: Court = {
        courtId: courtRef.id,
        name: `Court ${i}`,
        status: 'available',
        currentMatchId: null,
        available: true,
        order: i,
        updatedAt: serverTimestamp(),
      };
      batch.set(courtRef, courtData);
    }

    // Record audit event
    const auditRef = doc(collection(db, `sessions/${sessionId}/audit_logs`));
    batch.set(auditRef, {
      id: auditRef.id,
      sessionId,
      action: 'SESSION_STARTED',
      actorId: params.organizerId,
      actorName: params.organizerEmail || 'Organizer',
      timestamp: serverTimestamp(),
      metadata: { numberOfCourts: params.numberOfCourts, matchingMode: params.matchingMode },
    });

    await batch.commit();
    return sessionId;
  } catch (error) {
    console.warn('Firestore session create warning (proceeding with local session):', error);
    return sessionId;
  }
}

export async function getSessionByJoinCode(code: string): Promise<Session | null> {
  const cleanCode = code.trim().toUpperCase();
  const q = query(
    collection(db, 'sessions'),
    where('joinCode', '==', cleanCode),
    where('status', 'in', ['active', 'paused', 'draft'])
  );

  try {
    const snap = await getDocs(q);
    if (snap.empty) {
      // Check local cache for recent matching code
      const recent = JSON.parse(localStorage.getItem('picklequeue_recent_sessions') || '[]');
      for (const id of recent) {
        const cached = getCachedSession(id);
        if (cached && cached.session.joinCode === cleanCode) {
          return cached.session;
        }
      }
      return null;
    }
    const docSnap = snap.docs[0];
    return { id: docSnap.id, ...docSnap.data() } as Session;
  } catch (error) {
    console.warn('Error querying by join code, checking local cache:', error);
    try {
      const recent = JSON.parse(localStorage.getItem('picklequeue_recent_sessions') || '[]');
      for (const id of recent) {
        const cached = getCachedSession(id);
        if (cached && cached.session.joinCode === cleanCode) {
          return cached.session;
        }
      }
    } catch {}
    return null;
  }
}

export async function joinSessionAsParticipant(
  sessionId: string,
  params: {
    participantId?: string;
    name: string;
    skillLevel: SkillLevel;
  }
): Promise<Participant> {
  const participantsRef = collection(db, `sessions/${sessionId}/participants`);
  const participantDoc = params.participantId
    ? doc(db, `sessions/${sessionId}/participants`, params.participantId)
    : doc(participantsRef);
  const pId = participantDoc.id;

  try {
    // Determine current max queue position
    const snapshot = await getDocs(participantsRef);
    let maxPos = 0;
    snapshot.forEach((d) => {
      const pos = d.data().queuePosition || 0;
      if (pos > maxPos) maxPos = pos;
    });

    const newParticipant: Participant = {
      participantId: pId,
      sessionId,
      name: params.name.trim(),
      skillLevel: params.skillLevel,
      status: 'waiting',
      queuePosition: maxPos + 1,
      queueEnteredAt: serverTimestamp(),
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      resting: false,
      checkedIn: true,
      joinedAt: serverTimestamp(),
      previousPartnerIds: [],
      previousOpponentIds: [],
    };

    await setDoc(participantDoc, newParticipant);
    return newParticipant;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `sessions/${sessionId}/participants/${pId}`);
  }
}

export async function updateParticipantRestStatus(
  sessionId: string,
  participantId: string,
  resting: boolean
): Promise<void> {
  const ref = doc(db, `sessions/${sessionId}/participants`, participantId);
  try {
    await updateDoc(ref, {
      resting,
      status: resting ? 'resting' : 'waiting',
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `sessions/${sessionId}/participants/${participantId}`);
  }
}

export async function leaveSession(sessionId: string, participantId: string): Promise<void> {
  const ref = doc(db, `sessions/${sessionId}/participants`, participantId);
  try {
    await updateDoc(ref, {
      status: 'left',
      resting: false,
      leftAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `sessions/${sessionId}/participants/${participantId}`);
  }
}

export async function startMatchOnCourt(
  sessionId: string,
  courtId: string,
  courtName: string,
  proposal: GroupMatchProposal,
  matchingMode: MatchingMode | 'manual' = 'balanced'
): Promise<string> {
  const courtRef = doc(db, `sessions/${sessionId}/courts`, courtId);
  const matchRef = doc(collection(db, `sessions/${sessionId}/matches`));
  const matchId = matchRef.id;

  try {
    await runTransaction(db, async (txn) => {
      const courtSnap = await txn.get(courtRef);
      if (!courtSnap.exists()) {
        throw new Error('Court not found.');
      }
      const courtData = courtSnap.data();
      if (courtData.status === 'playing') {
        throw new Error(`${courtName} already has an active match in progress.`);
      }

      // Read all participants to verify they are not already playing
      const pSnaps = await Promise.all(
        proposal.players.map((p) => txn.get(doc(db, `sessions/${sessionId}/participants`, p.participantId)))
      );

      for (const pSnap of pSnaps) {
        if (!pSnap.exists()) throw new Error('One or more players no longer exist in session.');
        const pData = pSnap.data();
        if (pData.status === 'playing') {
          throw new Error(`Player ${pData.name} is already playing on another court.`);
        }
      }

      // 1. Create Match Doc
      const newMatch: Match = {
        matchId,
        sessionId,
        courtId,
        courtName,
        playerIds: proposal.players.map((p) => p.participantId),
        playerDetails: proposal.players.map((p) => ({
          participantId: p.participantId,
          name: p.name,
          skillLevel: p.skillLevel,
        })),
        teamA: proposal.teamA.map((p) => p.participantId),
        teamB: proposal.teamB.map((p) => p.participantId),
        teamANames: proposal.teamA.map((p) => p.name),
        teamBNames: proposal.teamB.map((p) => p.name),
        status: 'playing',
        matchingMode,
        startedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      txn.set(matchRef, newMatch);

      // 2. Update Court
      txn.update(courtRef, {
        status: 'playing',
        currentMatchId: matchId,
        updatedAt: serverTimestamp(),
      });

      // 3. Update all 4 participants to 'playing'
      proposal.players.forEach((p) => {
        const pRef = doc(db, `sessions/${sessionId}/participants`, p.participantId);
        txn.update(pRef, {
          status: 'playing',
          currentCourtId: courtId,
          currentMatchId: matchId,
        });
      });
    });

    return matchId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `sessions/${sessionId}/matches/${matchId}`);
  }
}

export async function completeMatch(
  sessionId: string,
  matchId: string,
  courtId: string,
  winningTeam: 'teamA' | 'teamB',
  score?: MatchScore
): Promise<void> {
  const matchRef = doc(db, `sessions/${sessionId}/matches`, matchId);
  const courtRef = doc(db, `sessions/${sessionId}/courts`, courtId);

  try {
    // Determine current max queue position
    const participantsSnap = await getDocs(collection(db, `sessions/${sessionId}/participants`));
    let maxPos = 0;
    participantsSnap.forEach((d) => {
      const pos = d.data().queuePosition || 0;
      if (pos > maxPos) maxPos = pos;
    });

    await runTransaction(db, async (txn) => {
      const matchSnap = await txn.get(matchRef);
      if (!matchSnap.exists()) throw new Error('Match record not found.');
      const matchData = matchSnap.data() as Match;

      if (matchData.status === 'completed') {
        throw new Error('This match has already been completed.');
      }

      // Calculate duration
      let durationSeconds = 600; // default fallback 10m
      if (matchData.startedAt) {
        const startMs = matchData.startedAt.toMillis ? matchData.startedAt.toMillis() : new Date(matchData.startedAt).getTime();
        durationSeconds = Math.max(60, Math.floor((Date.now() - startMs) / 1000));
      }

      // Update match
      txn.update(matchRef, {
        status: 'completed',
        endedAt: serverTimestamp(),
        durationSeconds,
        winningTeam,
        score: score || null,
        updatedAt: serverTimestamp(),
      });

      // Free up court
      txn.update(courtRef, {
        status: 'available',
        currentMatchId: null,
        updatedAt: serverTimestamp(),
      });

      const winnerIds = winningTeam === 'teamA' ? matchData.teamA : matchData.teamB;
      const loserIds = winningTeam === 'teamA' ? matchData.teamB : matchData.teamA;

      // Update each player's statistics and re-queue them (4 IN / 4 OUT rule)
      let offset = 1;
      for (const pId of matchData.playerIds) {
        const pRef = doc(db, `sessions/${sessionId}/participants`, pId);
        const pSnap = await txn.get(pRef);
        if (!pSnap.exists()) continue;

        const pData = pSnap.data() as Participant;
        const isWinner = winnerIds.includes(pId);
        const gamesPlayed = (pData.gamesPlayed || 0) + 1;
        const wins = (pData.wins || 0) + (isWinner ? 1 : 0);
        const losses = (pData.losses || 0) + (isWinner ? 0 : 1);
        const winRate = Math.round((wins / gamesPlayed) * 100);

        // Calculate co-play sets for Social Mix tracking
        const currentPartners = matchData.teamA.includes(pId)
          ? matchData.teamA.filter((id) => id !== pId)
          : matchData.teamB.filter((id) => id !== pId);
        const currentOpponents = matchData.teamA.includes(pId) ? matchData.teamB : matchData.teamA;

        const previousPartners = Array.from(new Set([...(pData.previousPartnerIds || []), ...currentPartners]));
        const previousOpponents = Array.from(new Set([...(pData.previousOpponentIds || []), ...currentOpponents]));

        txn.update(pRef, {
          status: 'waiting',
          currentCourtId: null,
          currentMatchId: null,
          gamesPlayed,
          wins,
          losses,
          winRate,
          lastMatchResult: isWinner ? 'win' : 'loss',
          lastPlayedAt: serverTimestamp(),
          queuePosition: maxPos + offset,
          queueEnteredAt: serverTimestamp(),
          previousPartnerIds: previousPartners.slice(-20),
          previousOpponentIds: previousOpponents.slice(-30),
        });

        offset++;
      }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `sessions/${sessionId}/matches/${matchId}`);
  }
}

export async function addCourtToSession(sessionId: string, name: string): Promise<string> {
  const courtsRef = collection(db, `sessions/${sessionId}/courts`);
  const courtDoc = doc(courtsRef);

  try {
    const snap = await getDocs(courtsRef);
    const order = snap.size + 1;

    const newCourt: Court = {
      courtId: courtDoc.id,
      name: name.trim() || `Court ${order}`,
      status: 'available',
      currentMatchId: null,
      available: true,
      order,
      updatedAt: serverTimestamp(),
    };

    await setDoc(courtDoc, newCourt);
    return courtDoc.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `sessions/${sessionId}/courts/${courtDoc.id}`);
  }
}

export async function updateCourtState(
  sessionId: string,
  courtId: string,
  updates: Partial<Court>
): Promise<void> {
  const ref = doc(db, `sessions/${sessionId}/courts`, courtId);
  try {
    await updateDoc(ref, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `sessions/${sessionId}/courts/${courtId}`);
  }
}

export async function removeCourtFromSession(sessionId: string, courtId: string): Promise<void> {
  const ref = doc(db, `sessions/${sessionId}/courts`, courtId);
  try {
    await deleteDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `sessions/${sessionId}/courts/${courtId}`);
  }
}

export async function updateSessionMode(sessionId: string, matchingMode: MatchingMode): Promise<void> {
  const ref = doc(db, `sessions/${sessionId}`);
  try {
    await updateDoc(ref, {
      matchingMode,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `sessions/${sessionId}`);
  }
}

export async function endSession(sessionId: string): Promise<void> {
  const ref = doc(db, `sessions/${sessionId}`);
  try {
    await updateDoc(ref, {
      status: 'completed',
      endedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `sessions/${sessionId}`);
  }
}

export async function bulkImportParticipants(
  sessionId: string,
  names: string[],
  defaultSkill: SkillLevel = 'intermediate'
): Promise<number> {
  const batch = writeBatch(db);
  const participantsRef = collection(db, `sessions/${sessionId}/participants`);

  const currentSnap = await getDocs(participantsRef);
  let maxPos = 0;
  currentSnap.forEach((d) => {
    const pos = d.data().queuePosition || 0;
    if (pos > maxPos) maxPos = pos;
  });

  let count = 0;
  for (const rawName of names) {
    const name = rawName.trim();
    if (!name) continue;

    const pDoc = doc(participantsRef);
    const p: Participant = {
      participantId: pDoc.id,
      sessionId,
      name,
      skillLevel: defaultSkill,
      status: 'waiting',
      queuePosition: maxPos + count + 1,
      queueEnteredAt: serverTimestamp(),
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      resting: false,
      checkedIn: true,
      joinedAt: serverTimestamp(),
      previousPartnerIds: [],
      previousOpponentIds: [],
    };
    batch.set(pDoc, p);
    count++;
  }

  if (count > 0) {
    await batch.commit();
  }
  return count;
}
