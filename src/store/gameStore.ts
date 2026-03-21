import { create } from 'zustand';
import { clearUsedQuestions } from '../services/questions';
import type { QuestionData } from '../services/questions';

export type Team = 'team1' | 'team2' | 'none';

export interface HexState {
  id: string; // col-row
  letter: string;
  row: number;
  colIndex: number;
  owner: Team;
}

// Base coordinates required to form the perfect 5-column interlocking honeycomb
export const BOARD_COORDINATES = [
  // Col 0
  { col: 0, row: 0 }, { col: 0, row: 1 }, { col: 0, row: 2 }, { col: 0, row: 3 }, { col: 0, row: 4 },
  // Col 1
  { col: 1, row: 0.5 }, { col: 1, row: 1.5 }, { col: 1, row: 2.5 }, { col: 1, row: 3.5 }, { col: 1, row: 4.5 },
  // Col 2
  { col: 2, row: 0 }, { col: 2, row: 1 }, { col: 2, row: 2 }, { col: 2, row: 3 }, { col: 2, row: 4 },
  // Col 3
  { col: 3, row: 0.5 }, { col: 3, row: 1.5 }, { col: 3, row: 2.5 }, { col: 3, row: 3.5 }, { col: 3, row: 4.5 },
  // Col 4
  { col: 4, row: 0 }, { col: 4, row: 1 }, { col: 4, row: 2 }, { col: 4, row: 3 }, { col: 4, row: 4 },
];

// The 25 symbols to use. 'غ' -> '#' (Number), 'ذ' -> '?' (Wildcard Steal)
const GAME_SYMBOLS = [
  'ب', 'ت', 'ر', 'ج', '#',  // Col 0 originally
  'ي', 'ث', '?', 'م', 'ز',  // Col 1 originally
  'ه', 'ض', 'ك', 'ن', 'و',  // Col 2 originally
  'س', 'ع', 'ص', 'د', 'خ',  // Col 3 originally
  'ق', 'ل', 'ط', 'أ', 'ش'   // Col 4 originally
];

// Fisher-Yates shuffle algorithm to randomize the symbols array
const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Generates a fresh board mapped to the fixed coordinates
const generateRandomBoard = (): HexState[] => {
  const shuffledSymbols = shuffleArray(GAME_SYMBOLS);
  
  return BOARD_COORDINATES.map(({ col, row }, index) => ({
    id: `${col}-${row}`,
    letter: shuffledSymbols[index],
    row,
    colIndex: col,
    owner: 'none' as Team
  }));
};

const INITIAL_BOARD = generateRandomBoard();

interface GameState {
  board: HexState[];
  currentTurn: Team;
  
  // Match & Round state tracking
  winner: Team | null; // This now means 'Round Winner' (temporarily won the board)
  matchWinner: Team | null; // This means ultimate victory
  team1RoundsWon: number;
  team2RoundsWon: number;
  requiredRoundsToWin: number;
  
  // History for Undo operations
  previousBoard: HexState[] | null;
  previousTurn: Team | null;
  previousWinner: Team | null;
  previousTeam1Rounds: number;
  previousTeam2Rounds: number;

  activeHexId: string | null;
  activeQuestion: QuestionData | null;
  hideQuestionFromPlayers: boolean;

  setRequiredRounds: (rounds: number) => void;
  setHideQuestionFromPlayers: (val: boolean) => void;
  setActiveQuestion: (hexId: string | null, question: QuestionData | null) => void;
  claimHex: (id: string, team: Team) => void;
  unclaimHex: (id: string) => void;
  nextTurn: () => void;
  undoLastMove: () => void;
  nextRound: () => void; // Keeps match scores, but resets board
  resetGame: () => void; // Destroys completely everything
}

// Helper to check if two hexes are adjacent
const areAdjacent = (h1: HexState, h2: HexState) => {
  const dc = Math.abs(h1.colIndex - h2.colIndex);
  const dr = Math.abs(h1.row - h2.row);
  
  if (dc === 0 && dr === 1.0) return true;
  if (dc === 1 && dr === 0.5) return true;
  
  return false;
};

// Check win condition using BFS
const checkWin = (board: HexState[], team: Team): boolean => {
  if (team === 'none') return false;

  const teamHexes = board.filter(h => h.owner === team);
  if (teamHexes.length === 0) return false;

  // Team 1 (Red) goes Left to Right
  // Team 2 (Green) goes Top to Bottom
  
  let startCondition: (h: HexState) => boolean;
  let endCondition: (h: HexState) => boolean;

  if (team === 'team1') {
    // Team Red: Left to Right (Col 0 to Col 4)
    startCondition = (h) => h.colIndex === 0;
    endCondition = (h) => h.colIndex === 4;
  } else {
    // Team Green: Top to Bottom (Row 0|0.5 to Row 4|4.5)
    startCondition = (h) => h.row === 0 || h.row === 0.5;
    endCondition = (h) => h.row === 4 || h.row === 4.5;
  }

  const queue = teamHexes.filter(startCondition);
  const visited = new Set<string>(queue.map(h => h.id));

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (endCondition(current)) return true;

    // Find all unvisited adjacent hexes owned by the team
    for (const neighbor of teamHexes) {
      if (!visited.has(neighbor.id) && areAdjacent(current, neighbor)) {
        visited.add(neighbor.id);
        queue.push(neighbor);
      }
    }
  }

  return false;
};

export const useGameStore = create<GameState>((set, get) => ({
  board: INITIAL_BOARD,
  currentTurn: 'team1',
  winner: null,
  matchWinner: null,
  team1RoundsWon: 0,
  team2RoundsWon: 0,
  requiredRoundsToWin: 2, // Default: best of 3 (first to 2 wins)

  previousBoard: null,
  previousTurn: null,
  previousWinner: null,
  previousTeam1Rounds: 0,
  previousTeam2Rounds: 0,

  activeHexId: null,
  activeQuestion: null,
  hideQuestionFromPlayers: false,

  setRequiredRounds: (rounds: number) => set({ requiredRoundsToWin: rounds }),
  setHideQuestionFromPlayers: (val) => set({ hideQuestionFromPlayers: val }),
  setActiveQuestion: (hexId, question) => set({ activeHexId: hexId, activeQuestion: question }),
  
  claimHex: (id: string, team: Team) => {
    const { board, matchWinner, currentTurn, team1RoundsWon, team2RoundsWon, requiredRoundsToWin, winner } = get();
    if (matchWinner || winner) return; // Prevent moves if round or match is technically over

    // Snapshot history before mutating
    const historyBoard = [...board];
    const historyTurn = currentTurn;
    const historyWinner = winner;
    const historyT1Rounds = team1RoundsWon;
    const historyT2Rounds = team2RoundsWon;

    const newBoard = board.map(hex => 
      hex.id === id ? { ...hex, owner: team } : hex
    );

    const hasWonRound = checkWin(newBoard, team);
    
    let newT1Rounds = team1RoundsWon;
    let newT2Rounds = team2RoundsWon;
    let newMatchWinner: Team | null = matchWinner;
    
    if (hasWonRound) {
      if (team === 'team1') newT1Rounds++;
      if (team === 'team2') newT2Rounds++;
      
      if (newT1Rounds >= requiredRoundsToWin) newMatchWinner = 'team1';
      if (newT2Rounds >= requiredRoundsToWin) newMatchWinner = 'team2';
    }

    set({
      board: newBoard,
      winner: hasWonRound ? team : null,
      matchWinner: newMatchWinner,
      team1RoundsWon: newT1Rounds,
      team2RoundsWon: newT2Rounds,
      currentTurn: currentTurn === 'team1' ? 'team2' : 'team1',
      
      // Save history snapshot safely
      previousBoard: historyBoard,
      previousTurn: historyTurn,
      previousWinner: historyWinner,
      previousTeam1Rounds: historyT1Rounds,
      previousTeam2Rounds: historyT2Rounds
    });
  },

  unclaimHex: (id: string) => {
    const { board, winner, currentTurn } = get();
    // Usually unused while a winner exists because of the UI block, but historically safe:
    if (winner) return;

    const historyBoard = [...board];
    const newBoard = board.map(hex => 
      hex.id === id ? { ...hex, owner: 'none' as Team } : hex
    );

    set({ 
      board: newBoard,
      previousBoard: historyBoard,
      previousTurn: currentTurn,
      // For unclaim, we preserve the round counts
      previousTeam1Rounds: get().team1RoundsWon,
      previousTeam2Rounds: get().team2RoundsWon
    });
  },

  nextTurn: () => {
    const { board, currentTurn, winner } = get();
    if (winner) return;
    
    const historyBoard = [...board];
    
    set({ 
      currentTurn: currentTurn === 'team1' ? 'team2' : 'team1',
      previousBoard: historyBoard,
      previousTurn: currentTurn,
      previousTeam1Rounds: get().team1RoundsWon,
      previousTeam2Rounds: get().team2RoundsWon
    });
  },

  undoLastMove: () => {
    const { previousBoard, previousTurn, previousWinner, previousTeam1Rounds, previousTeam2Rounds } = get();
    if (!previousBoard || !previousTurn) return;

    set({
      board: [...previousBoard],
      currentTurn: previousTurn,
      winner: previousWinner,
      matchWinner: null, // Since we undo, they lose the match winner condition regardless
      team1RoundsWon: previousTeam1Rounds,
      team2RoundsWon: previousTeam2Rounds,
      
      // Wipe history strictly to prevent exploiting
      previousBoard: null,
      previousTurn: null,
      previousWinner: null,
      
      activeHexId: null,
      activeQuestion: null
    });
  },

  nextRound: () => {
    // Generate a fresh shuffled board, pass the turn to whoever didn't go first, and keep the scores
    // Note: The player turn typically stays with whatever it calculated normally unless explicitly tracked differently
    set({
      board: generateRandomBoard(),
      winner: null,
      previousBoard: null,
      previousTurn: null,
      activeHexId: null,
      activeQuestion: null
    });
  },

  resetGame: () => {
    // Explicitly wipes the question cache since it's an entirely new lobby match
    clearUsedQuestions();

    set({
      board: generateRandomBoard(),
      currentTurn: 'team1',
      winner: null,
      matchWinner: null,
      team1RoundsWon: 0,
      team2RoundsWon: 0,
      
      previousBoard: null,
      previousTurn: null,
      previousWinner: null,
      activeHexId: null,
      activeQuestion: null,
      hideQuestionFromPlayers: false
    });
  }
}));
