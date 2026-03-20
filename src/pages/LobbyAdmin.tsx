import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Check, Users, Play } from 'lucide-react';
import { useRoomStore, assignTeam, startGame } from '../store/roomStore';
import type { Player, Team } from '../store/roomStore';
import { supabase } from '../lib/supabase';

export const LobbyAdmin: React.FC = () => {
  const navigate = useNavigate();
  const { roomCode, roomId, players, setPlayers } = useRoomStore();
  const [copied, setCopied] = useState(false);

  // Load initial players and keep them updated
  useEffect(() => {
    if (!roomId) return;

    const fetchPlayers = async () => {
      const { data } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', roomId)
        .order('joined_at', { ascending: true });
      if (data) setPlayers(data as Player[]);
    };

    fetchPlayers();
    // Refresh every 2s as a fallback in case realtime is slow
    const interval = setInterval(fetchPlayers, 2000);
    return () => clearInterval(interval);
  }, [roomId, setPlayers]);

  const handleCopyCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAssignTeam = async (playerId: string, team: Team) => {
    await assignTeam(playerId, team);
    // Optimistic update
    setPlayers(players.map(p => p.id === playerId ? { ...p, team } : p));
  };

  const canStart = players.length >= 2 && players.every(p => p.team !== 'none');

  const handleStartGame = async () => {
    if (!roomId || !canStart) return;
    await startGame(roomId);
    navigate('/game-admin');
  };

  const redTeam = players.filter(p => p.team === 'team1');
  const greenTeam = players.filter(p => p.team === 'team2');
  const unassigned = players.filter(p => p.team === 'none');

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'radial-gradient(circle at 50% 10%, rgb(30,30,40) 0%, rgb(8,8,15) 100%)',
      color: 'white', fontFamily: "'Cairo', sans-serif", direction: 'rtl',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '800' }}>لوبي المدير</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} color="#aaa" />
            <span style={{ color: '#aaa', fontSize: '1rem' }}>{players.length} لاعبين</span>
          </div>
        </div>

        {/* Room Code Box */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(255,94,98,0.15) 0%, rgba(255,65,108,0.1) 100%)',
          border: '1px solid rgba(255,94,98,0.4)', borderRadius: '16px',
          padding: '16px 20px', marginBottom: '16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '4px' }}>رمز الغرفة — شاركه مع اللاعبين</div>
            <div style={{ fontSize: '2.8rem', fontWeight: '900', letterSpacing: '10px', color: '#ff6b6b' }}>{roomCode}</div>
          </div>
          <button
            onClick={handleCopyCode}
            style={{
              background: copied ? 'rgba(0,176,155,0.3)' : 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px',
              color: 'white', padding: '12px', cursor: 'pointer', transition: 'all 0.3s',
            }}
          >
            {copied ? <Check size={22} color="#00b09b" /> : <Copy size={22} />}
          </button>
        </div>

        {/* Start Game Button */}
        <button
          onClick={handleStartGame}
          disabled={!canStart}
          style={{
            width: '100%', padding: '16px',
            background: canStart
              ? 'linear-gradient(135deg, #f7971e, #ffd200)'
              : 'rgba(80,80,80,0.5)',
            border: 'none', borderRadius: '14px',
            color: canStart ? '#1a1a1a' : '#666',
            fontSize: '1.3rem', fontWeight: '900',
            cursor: canStart ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            marginBottom: '16px',
            boxShadow: canStart ? '0 10px 25px rgba(247,151,30,0.4)' : 'none',
            transition: 'all 0.3s',
          }}
        >
          <Play size={20} />
          {canStart ? 'ابدأ اللعبة!' : players.length < 2 ? 'في انتظار لاعبين...' : 'قسّم الفرق أولاً'}
        </button>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '6px' }}>
          {[
            { label: 'غير مقسّمين', count: unassigned.length, color: '#888' },
            { label: 'الفريق الأحمر', count: redTeam.length, color: '#ff416c' },
            { label: 'الفريق الأخضر', count: greenTeam.length, color: '#00b09b' },
          ].map(({ label, count, color }) => (
            <div key={label} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: '900', color }}>{count}</div>
              <div style={{ fontSize: '0.75rem', color: '#777' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Player List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 24px 24px' }}>
        {players.length === 0 && (
          <div style={{ textAlign: 'center', color: '#555', fontSize: '1.1rem', marginTop: '40px' }}>
            <Users size={48} color="#333" style={{ marginBottom: '12px' }} />
            <div>لم ينضم أي لاعب بعد</div>
            <div style={{ fontSize: '0.9rem', color: '#444', marginTop: '6px' }}>شارك رمز الغرفة مع اللاعبين</div>
          </div>
        )}
        {players.map((player) => (
          <PlayerRow key={player.id} player={player} onAssign={handleAssignTeam} />
        ))}
      </div>
    </div>
  );
};

const PlayerRow: React.FC<{ player: Player; onAssign: (id: string, team: Team) => void }> = ({ player, onAssign }) => {
  const teamColor = player.team === 'team1' ? '#ff416c' : player.team === 'team2' ? '#00b09b' : '#555';
  const teamLabel = player.team === 'team1' ? 'أحمر' : player.team === 'team2' ? 'أخضر' : 'بدون فريق';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: 'rgba(255,255,255,0.05)', borderRadius: '14px',
      padding: '14px 16px', marginBottom: '10px',
      border: `1px solid ${player.team !== 'none' ? teamColor + '44' : 'rgba(255,255,255,0.07)'}`,
      transition: 'all 0.3s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%',
          background: `linear-gradient(135deg, ${teamColor}44, ${teamColor}22)`,
          border: `2px solid ${teamColor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1rem', fontWeight: '800', color: teamColor,
          flexShrink: 0,
        }}>
          {player.name[0]}
        </div>
        <div>
          <div style={{ fontSize: '1.1rem', fontWeight: '700' }}>{player.name}</div>
          <div style={{ fontSize: '0.85rem', color: teamColor }}>{teamLabel}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => onAssign(player.id, 'team1')}
          style={{
            padding: '8px 14px', background: player.team === 'team1' ? '#ff416c' : 'rgba(255,65,108,0.15)',
            border: '1px solid rgba(255,65,108,0.5)', borderRadius: '10px',
            color: 'white', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          أحمر
        </button>
        <button
          onClick={() => onAssign(player.id, 'team2')}
          style={{
            padding: '8px 14px', background: player.team === 'team2' ? '#00b09b' : 'rgba(0,176,155,0.15)',
            border: '1px solid rgba(0,176,155,0.5)', borderRadius: '10px',
            color: 'white', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          أخضر
        </button>
      </div>
    </div>
  );
};
