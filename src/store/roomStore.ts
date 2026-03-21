import { create } from 'zustand';
import type { HexState } from './gameStore';

export type Team = 'team1' | 'team2' | 'none';
export type GamePhase = 'lobby' | 'game' | 'finished';

export interface PlayerPresence {
  clientId: string;
  name: string;
  team: Team;
  isAdmin: boolean;
}

export interface BuzzEvent {
  playerId: string;
  playerName: string;
  team: Team;
  timestamp: number;
}

export interface GameBroadcast {
  board?: HexState[];
  currentTurn?: Team;
  team1RoundsWon?: number;
  team2RoundsWon?: number;
  winner?: Team | null;
  matchWinner?: Team | null;
  questionActive?: boolean;
  currentQuestion?: { question: string; letter: string } | null;
  answerRevealed?: boolean;
  awardedTeam?: Team | null;
  revealedAnswer?: string | null;
  gamePhase?: GamePhase;
  buzzQueue?: BuzzEvent[];
}

interface RoomState {
  roomCode: string | null;
  clientId: string;
  isAdmin: boolean;
  myName: string;
  myTeam: Team;
  players: PlayerPresence[];
  gamePhase: GamePhase;
  buzzQueue: BuzzEvent[];

  // Question state (synced via broadcast for players)
  questionActive: boolean;
  currentQuestion: { question: string; letter: string } | null;
  answerRevealed: boolean;
  awardedTeam: Team | null;
  revealedAnswer: string | null;

  // Synced board state for player display
  syncedBoard: HexState[];
  syncedTurn: Team;
  syncedTeam1Rounds: number;
  syncedTeam2Rounds: number;
  matchWinner: Team | null;

  // Actions
  setRoomCode: (code: string | null) => void;
  setIsAdmin: (isAdmin: boolean) => void;
  setMyName: (name: string) => void;
  setMyTeam: (team: Team) => void;
  setPlayers: (players: PlayerPresence[]) => void;
  setGamePhase: (phase: GamePhase) => void;
  addBuzz: (buzz: BuzzEvent) => void;
  clearBuzzes: () => void;
  applyGameBroadcast: (data: GameBroadcast) => void;
  resetRoom: () => void;
}

const getClientId = (): string => {
  let id = sessionStorage.getItem('lettersdual_client_id');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('lettersdual_client_id', id);
  }
  return id;
};

export const generateRoomCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

export const useRoomStore = create<RoomState>((set) => ({
  roomCode: null,
  clientId: getClientId(),
  isAdmin: false,
  myName: '',
  myTeam: 'none',
  players: [],
  gamePhase: 'lobby',
  buzzQueue: [],
  questionActive: false,
  currentQuestion: null,
  answerRevealed: false,
  awardedTeam: null,
  revealedAnswer: null,
  syncedBoard: [],
  syncedTurn: 'team1',
  syncedTeam1Rounds: 0,
  syncedTeam2Rounds: 0,
  matchWinner: null,

  setRoomCode: (code) => set({ roomCode: code }),
  setIsAdmin: (isAdmin) => set({ isAdmin }),
  setMyName: (name) => set({ myName: name }),
  setMyTeam: (team) => set({ myTeam: team }),
  setPlayers: (players) => set({ players }),
  setGamePhase: (phase) => set({ gamePhase: phase }),
  addBuzz: (buzz) => set((state) => {
    if (state.buzzQueue.some(b => b.playerId === buzz.playerId)) return state;
    return { buzzQueue: [...state.buzzQueue, buzz] };
  }),
  clearBuzzes: () => set({ buzzQueue: [] }),

  applyGameBroadcast: (data) => set((state) => ({
    ...(data.board !== undefined && { syncedBoard: data.board }),
    ...(data.currentTurn !== undefined && { syncedTurn: data.currentTurn }),
    ...(data.team1RoundsWon !== undefined && { syncedTeam1Rounds: data.team1RoundsWon }),
    ...(data.team2RoundsWon !== undefined && { syncedTeam2Rounds: data.team2RoundsWon }),
    ...(data.matchWinner !== undefined && { matchWinner: data.matchWinner }),
    ...(data.questionActive !== undefined && {
      questionActive: data.questionActive,
      buzzQueue: data.questionActive ? state.buzzQueue : [],
    }),
    ...(data.currentQuestion !== undefined && { currentQuestion: data.currentQuestion }),
    ...(data.answerRevealed !== undefined && { answerRevealed: data.answerRevealed }),
    ...(data.awardedTeam !== undefined && { awardedTeam: data.awardedTeam }),
    ...(data.revealedAnswer !== undefined && { revealedAnswer: data.revealedAnswer }),
    ...(data.gamePhase !== undefined && { gamePhase: data.gamePhase }),
    ...(data.buzzQueue !== undefined && { buzzQueue: data.buzzQueue }),
  })),

  resetRoom: () => set({
    roomCode: null,
    isAdmin: false,
    myName: '',
    myTeam: 'none',
    players: [],
    gamePhase: 'lobby',
    buzzQueue: [],
    questionActive: false,
    currentQuestion: null,
    answerRevealed: false,
    awardedTeam: null,
    revealedAnswer: null,
    syncedBoard: [],
    syncedTurn: 'team1',
    syncedTeam1Rounds: 0,
    syncedTeam2Rounds: 0,
    matchWinner: null,
  }),
}));
