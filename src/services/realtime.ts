import { supabase } from '../lib/supabase';
import { useRoomStore } from '../store/roomStore';
import type { Player, BuzzEvent, Team } from '../store/roomStore';

type RealtimeChannel = ReturnType<typeof supabase.channel>;

let activeChannel: RealtimeChannel | null = null;

export type BroadcastMessage =
  | { type: 'BUZZ'; payload: BuzzEvent }
  | { type: 'QUESTION_START'; payload: { question: string; answer: string; letter: string } }
  | { type: 'QUESTION_CLEAR' }
  | { type: 'REVEAL_ANSWER'; payload: { team: Team } }
  | { type: 'GAME_STATE_UPDATE'; payload: object };

export const subscribeToRoom = (roomCode: string, roomId: string): void => {
  // Unsubscribe from any previous channel
  if (activeChannel) {
    supabase.removeChannel(activeChannel);
    activeChannel = null;
  }

  const channel = supabase.channel(`room:${roomCode}`, {
    config: { broadcast: { self: false } },
  });

  // Listen for player table changes (new joins, team updates)
  channel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'players',
      filter: `room_id=eq.${roomId}`,
    },
    async () => {
      // Re-fetch all players when something changes
      const { data } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', roomId)
        .order('joined_at', { ascending: true });

      if (data) {
        const store = useRoomStore.getState();
        const players = data as Player[];
        store.setPlayers(players);

        // Update myPlayer if it exists
        if (store.myPlayer) {
          const updated = players.find(p => p.client_id === store.clientId);
          if (updated) store.setMyPlayer(updated);
        }
      }
    }
  );

  // Listen for room table changes (phase changes, game state updates)
  channel.on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'rooms',
      filter: `id=eq.${roomId}`,
    },
    (payload) => {
      const store = useRoomStore.getState();
      const newRoom = payload.new as { phase: string; game_state: Record<string, unknown> };
      
      if (newRoom.phase && newRoom.phase !== store.gamePhase) {
        store.setGamePhase(newRoom.phase as 'lobby' | 'game' | 'finished');
      }
    }
  );

  // Listen for broadcast messages (buzz, question, reveal)
  channel.on('broadcast', { event: 'GAME_EVENT' }, ({ payload }: { payload: BroadcastMessage }) => {
    const store = useRoomStore.getState();

    if (payload.type === 'BUZZ') {
      store.addBuzz(payload.payload);
    } else if (payload.type === 'QUESTION_START') {
      store.setQuestionActive(true, payload.payload);
    } else if (payload.type === 'QUESTION_CLEAR') {
      store.setQuestionActive(false);
    } else if (payload.type === 'REVEAL_ANSWER') {
      store.setAnswerRevealed(true, payload.payload.team);
    } else if (payload.type === 'GAME_STATE_UPDATE') {
      // handled by postgres_changes listener above for non-realtime clients
    }
  });

  channel.subscribe();
  activeChannel = channel;
};

export const unsubscribeFromRoom = (): void => {
  if (activeChannel) {
    supabase.removeChannel(activeChannel);
    activeChannel = null;
  }
};

export const broadcastBuzz = async (_roomCode: string, buzzData: BuzzEvent): Promise<void> => {
  if (!activeChannel) return;
  await activeChannel.send({
    type: 'broadcast',
    event: 'GAME_EVENT',
    payload: { type: 'BUZZ', payload: buzzData } as BroadcastMessage,
  });
  // Also add to local store immediately for the player who buzzed
  useRoomStore.getState().addBuzz(buzzData);
};

export const broadcastQuestionStart = async (
  question: string,
  answer: string,
  letter: string
): Promise<void> => {
  if (!activeChannel) return;
  const payload: BroadcastMessage = { type: 'QUESTION_START', payload: { question, answer, letter } };
  await activeChannel.send({ type: 'broadcast', event: 'GAME_EVENT', payload });
  // Update local state for admin
  useRoomStore.getState().setQuestionActive(true, { question, answer, letter });
};

export const broadcastQuestionClear = async (): Promise<void> => {
  if (!activeChannel) return;
  const payload: BroadcastMessage = { type: 'QUESTION_CLEAR' };
  await activeChannel.send({ type: 'broadcast', event: 'GAME_EVENT', payload });
  useRoomStore.getState().setQuestionActive(false);
};

export const broadcastRevealAnswer = async (team: Team): Promise<void> => {
  if (!activeChannel) return;
  const payload: BroadcastMessage = { type: 'REVEAL_ANSWER', payload: { team } };
  await activeChannel.send({ type: 'broadcast', event: 'GAME_EVENT', payload });
  useRoomStore.getState().setAnswerRevealed(true, team);
};
