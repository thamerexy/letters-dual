import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export type Team = 'team1' | 'team2' | 'none';
export type GamePhase = 'lobby' | 'game' | 'finished';

export interface Player {
  id: string;
  room_id: string;
  name: string;
  team: Team;
  client_id: string;
}

export interface BuzzEvent {
  playerId: string;
  playerName: string;
  team: Team;
  timestamp: number;
}

interface RoomState {
  roomCode: string | null;
  roomId: string | null;
  clientId: string;
  adminId: string | null;
  isAdmin: boolean;
  players: Player[];
  myPlayer: Player | null;
  gamePhase: GamePhase;
  buzzQueue: BuzzEvent[];
  questionActive: boolean;
  currentQuestion: { question: string; answer: string; letter: string } | null;
  answerRevealed: boolean;
  awardedTeam: Team | null;

  // Actions
  setRoomCode: (code: string) => void;
  setRoomId: (id: string) => void;
  setPlayers: (players: Player[]) => void;
  setMyPlayer: (player: Player | null) => void;
  setGamePhase: (phase: GamePhase) => void;
  addBuzz: (buzz: BuzzEvent) => void;
  clearBuzzes: () => void;
  setQuestionActive: (active: boolean, question?: { question: string; answer: string; letter: string } | null) => void;
  setAnswerRevealed: (revealed: boolean, team?: Team | null) => void;
  resetRoom: () => void;
}

// Generate a stable client ID for this browser session
const getClientId = (): string => {
  let id = sessionStorage.getItem('lettersdual_client_id');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('lettersdual_client_id', id);
  }
  return id;
};

// Generate a 4-letter room code
export const generateRoomCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I/O to avoid confusion
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

export const useRoomStore = create<RoomState>((set) => ({
  roomCode: null,
  roomId: null,
  clientId: getClientId(),
  adminId: null,
  isAdmin: false,
  players: [],
  myPlayer: null,
  gamePhase: 'lobby',
  buzzQueue: [],
  questionActive: false,
  currentQuestion: null,
  answerRevealed: false,
  awardedTeam: null,

  setRoomCode: (code) => set({ roomCode: code }),
  setRoomId: (id) => set({ roomId: id }),
  setPlayers: (players) => set({ players }),
  setMyPlayer: (player) => set({ myPlayer: player }),
  setGamePhase: (phase) => set({ gamePhase: phase }),
  addBuzz: (buzz) => set((state) => {
    // Only add if this player hasn't buzzed already
    const alreadyBuzzed = state.buzzQueue.some(b => b.playerId === buzz.playerId);
    if (alreadyBuzzed) return state;
    return { buzzQueue: [...state.buzzQueue, buzz] };
  }),
  clearBuzzes: () => set({ buzzQueue: [] }),
  setQuestionActive: (active, question = null) => set({
    questionActive: active,
    currentQuestion: question ?? null,
    answerRevealed: false,
    awardedTeam: null,
    buzzQueue: [],
  }),
  setAnswerRevealed: (revealed, team = null) => set({
    answerRevealed: revealed,
    awardedTeam: team ?? null,
  }),
  resetRoom: () => set({
    roomCode: null,
    roomId: null,
    adminId: null,
    isAdmin: false,
    players: [],
    myPlayer: null,
    gamePhase: 'lobby',
    buzzQueue: [],
    questionActive: false,
    currentQuestion: null,
    answerRevealed: false,
    awardedTeam: null,
  }),
}));

// --- Supabase helper actions (called from components) ---

export const createRoom = async (): Promise<{ roomCode: string; roomId: string; adminId: string } | null> => {
  const clientId = getClientId();
  const code = generateRoomCode();

  const { data, error } = await supabase
    .from('rooms')
    .insert({
      code,
      admin_id: clientId,
      game_state: {},
      phase: 'lobby',
    })
    .select()
    .single();

  if (error || !data) {
    console.error('Error creating room:', error);
    return null;
  }

  useRoomStore.setState({
    roomCode: code,
    roomId: data.id,
    adminId: clientId,
    isAdmin: true,
    gamePhase: 'lobby',
  });

  return { roomCode: code, roomId: data.id, adminId: clientId };
};

export const joinRoom = async (code: string, name: string): Promise<boolean> => {
  const clientId = getClientId();
  const upperCode = code.toUpperCase().trim();

  // Find the room
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('*')
    .eq('code', upperCode)
    .single();

  if (roomError || !room) {
    console.error('Room not found:', roomError);
    return false;
  }

  // Insert player
  const { data: player, error: playerError } = await supabase
    .from('players')
    .insert({
      room_id: room.id,
      name,
      team: 'none',
      client_id: clientId,
    })
    .select()
    .single();

  if (playerError || !player) {
    console.error('Error joining room:', playerError);
    return false;
  }

  useRoomStore.setState({
    roomCode: upperCode,
    roomId: room.id,
    adminId: room.admin_id,
    isAdmin: false,
    myPlayer: player as Player,
    gamePhase: room.phase as GamePhase,
  });

  return true;
};

export const assignTeam = async (playerId: string, team: Team): Promise<void> => {
  await supabase
    .from('players')
    .update({ team })
    .eq('id', playerId);
};

export const startGame = async (roomId: string): Promise<void> => {
  await supabase
    .from('rooms')
    .update({ phase: 'game' })
    .eq('id', roomId);
};

export const syncGameState = async (roomId: string, state: object): Promise<void> => {
  await supabase
    .from('rooms')
    .update({ game_state: state })
    .eq('id', roomId);
};
