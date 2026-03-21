import { supabase } from '../lib/supabase';
import { useRoomStore } from '../store/roomStore';
import type { PlayerPresence, BuzzEvent, Team, GameBroadcast } from '../store/roomStore';

type RealtimeChannel = ReturnType<typeof supabase.channel>;

let activeChannel: RealtimeChannel | null = null;
let currentPresence: PlayerPresence | null = null;

type BroadcastPayload =
  | { type: 'BUZZ'; data: BuzzEvent }
  | { type: 'TEAM_ASSIGN'; clientId: string; team: Team }
  | { type: 'GAME_STATE'; data: GameBroadcast };

const syncPresence = (channel: RealtimeChannel) => {
  const raw = channel.presenceState();
  const players: PlayerPresence[] = [];
  for (const presences of Object.values(raw)) {
    for (const p of (presences as unknown as PlayerPresence[])) {
      if (!p.isAdmin) players.push(p);
    }
  }
  useRoomStore.getState().setPlayers(players);
};

/**
 * Connect to a Supabase Realtime channel for this room.
 * Uses Presence + Broadcast only — NO database tables needed.
 */
export const subscribeToRoom = (roomCode: string, presence: PlayerPresence): Promise<void> => {
  if (activeChannel) {
    supabase.removeChannel(activeChannel);
    activeChannel = null;
  }
  currentPresence = { ...presence };

  return new Promise((resolve, reject) => {
    const channel = supabase.channel(`game:${roomCode}`, {
      config: {
        presence: { key: presence.clientId },
        broadcast: { self: false },
      },
    });

    channel.on('presence', { event: 'sync' }, () => syncPresence(channel));
    channel.on('presence', { event: 'join' }, () => syncPresence(channel));
    channel.on('presence', { event: 'leave' }, () => syncPresence(channel));

    channel.on('broadcast', { event: 'GAME' }, ({ payload }: { payload: BroadcastPayload }) => {
      const store = useRoomStore.getState();
      if (payload.type === 'BUZZ') {
        // ONLY the Admin processes individual buzz broadcasts to build the official queue.
        // Players wait for the Admin's GAME_STATE sync.
        if (store.isAdmin) {
          store.addBuzz(payload.data);
        }
      } else if (payload.type === 'TEAM_ASSIGN') {
        if (payload.clientId === store.clientId) {
          store.setMyTeam(payload.team);
          if (currentPresence) {
            currentPresence = { ...currentPresence, team: payload.team };
            channel.track(currentPresence);
          }
        }
      } else if (payload.type === 'GAME_STATE') {
        if (!store.isAdmin) {
          store.applyGameBroadcast(payload.data);
        }
      }
    });

    let timeoutId: ReturnType<typeof setTimeout>;
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        clearTimeout(timeoutId);
        await channel.track(currentPresence!);
        activeChannel = channel;
        resolve();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        clearTimeout(timeoutId);
        reject(new Error(`Connection error: ${status}`));
      }
    });
    timeoutId = setTimeout(() => reject(new Error('Connection timed out')), 10000);
  });
};

export const unsubscribeFromRoom = (): void => {
  if (activeChannel) {
    supabase.removeChannel(activeChannel);
    activeChannel = null;
    currentPresence = null;
  }
};

/** Admin assigns a player to a team. Optimistic update included. */
export const broadcastTeamAssign = async (clientId: string, team: Team): Promise<void> => {
  if (!activeChannel) return;
  await activeChannel.send({
    type: 'broadcast', event: 'GAME',
    payload: { type: 'TEAM_ASSIGN', clientId, team } as BroadcastPayload,
  });
  const store = useRoomStore.getState();
  store.setPlayers(store.players.map(p => p.clientId === clientId ? { ...p, team } : p));
};

/** Admin broadcasts game state to all players. Also applies locally (self:false). */
export const broadcastGameState = async (data: GameBroadcast): Promise<void> => {
  if (!activeChannel) return;
  await activeChannel.send({
    type: 'broadcast', event: 'GAME',
    payload: { type: 'GAME_STATE', data } as BroadcastPayload,
  });
  // Admin applies locally
  if (useRoomStore.getState().isAdmin) {
    useRoomStore.getState().applyGameBroadcast(data);
  }
};

/** Player sends a buzz event. Also adds to local queue immediately. */
export const broadcastBuzz = async (_roomCode: string, buzzData: BuzzEvent): Promise<void> => {
  if (!activeChannel) return;
  await activeChannel.send({
    type: 'broadcast', event: 'GAME',
    payload: { type: 'BUZZ', data: buzzData } as BroadcastPayload,
  });
  // NOTE: Players no longer add buzz locally. 
  // They wait for the Admin's official sorted sync.
  if (useRoomStore.getState().isAdmin) {
    useRoomStore.getState().addBuzz(buzzData);
  }
};
