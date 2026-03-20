import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Check, Users, Play } from 'lucide-react';
import { useRoomStore } from '../store/roomStore';
import type { Team } from '../store/roomStore';
import { broadcastTeamAssign, broadcastGameState } from '../services/realtime';

export const LobbyAdmin: React.FC = () => {
  const navigate = useNavigate();
  const { roomCode, players, setGamePhase } = useRoomStore();
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAssignTeam = async (clientId: string, team: Team) => {
    await broadcastTeamAssign(clientId, team);
  };

  const canStart = players.length >= 1 && players.every(p => p.team !== 'none');

  const handleStartGame = async () => {
    if (!canStart) return;
    setGamePhase('game');
    await broadcastGameState({ gamePhase: 'game' });
    navigate('/game-admin');
  };

  const redTeam = players.filter(p => p.team === 'team1');
  const greenTeam = players.filter(p => p.team === 'team2');
  const unassigned = players.filter(p => p.team === 'none');

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'radial-gradient(circle at 50% 10%, rgb(28,30,40) 0%, rgb(8,8,15) 100%)',
      color: 'white', fontFamily: "'Cairo', sans-serif", direction: 'rtl',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '18px 20px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800' }}>لوبي المدير</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#666', fontSize: '0.9rem' }}>
            <Users size={16} />
            {players.length} لاعب
          </div>
        </div>

        {/* Room Code */}
        <div style={{
          background: 'rgba(255,94,98,0.1)', border: '1px solid rgba(255,94,98,0.35)',
          borderRadius: '14px', padding: '14px 18px', marginBottom: '12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '2px' }}>رمز الغرفة — شاركه مع اللاعبين</div>
            <div style={{ fontSize: '2.6rem', fontWeight: '900', letterSpacing: '10px', color: '#ff6b6b' }}>{roomCode}</div>
          </div>
          <button onClick={handleCopyCode} style={{
            background: copied ? 'rgba(0,176,155,0.25)' : 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px',
            color: 'white', padding: '10px', cursor: 'pointer', transition: 'all 0.25s',
          }}>
            {copied ? <Check size={20} color="#00b09b" /> : <Copy size={20} />}
          </button>
        </div>

        {/* Start Button */}
        <button onClick={handleStartGame} disabled={!canStart} style={{
          width: '100%', padding: '15px',
          background: canStart ? 'linear-gradient(135deg, #f7971e, #ffd200)' : 'rgba(60,60,60,0.5)',
          border: 'none', borderRadius: '14px',
          color: canStart ? '#1a1a1a' : '#555',
          fontSize: '1.2rem', fontWeight: '900', cursor: canStart ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
          marginBottom: '12px',
          boxShadow: canStart ? '0 8px 22px rgba(247,151,30,0.38)' : 'none',
          transition: 'all 0.3s',
        }}>
          <Play size={20} />
          {canStart ? 'ابدأ اللعبة!' : players.length === 0 ? 'انتظر انضمام لاعبين...' : 'قسّم الفرق أولاً'}
        </button>

        {/* Team counts */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          {[
            { label: 'بدون فريق', count: unassigned.length, color: '#666' },
            { label: 'الأحمر', count: redTeam.length, color: '#ff416c' },
            { label: 'الأخضر', count: greenTeam.length, color: '#00b09b' },
          ].map(({ label, count, color }) => (
            <div key={label} style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '7px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.3rem', fontWeight: '900', color }}>{count}</div>
              <div style={{ fontSize: '0.7rem', color: '#666' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Player List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 20px' }}>
        {players.length === 0 && (
          <div style={{ textAlign: 'center', color: '#444', marginTop: '36px' }}>
            <Users size={44} color="#2a2a2a" style={{ marginBottom: '10px' }} />
            <div style={{ fontSize: '1rem' }}>لم ينضم أي لاعب بعد</div>
            <div style={{ fontSize: '0.85rem', color: '#333', marginTop: '4px' }}>شارك رمز الغرفة مع اللاعبين</div>
          </div>
        )}
        {players.map((player) => {
          const teamColor = player.team === 'team1' ? '#ff416c' : player.team === 'team2' ? '#00b09b' : '#555';
          const teamLabel = player.team === 'team1' ? 'أحمر' : player.team === 'team2' ? 'أخضر' : 'بدون فريق';
          return (
            <div key={player.clientId} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'rgba(255,255,255,0.04)', borderRadius: '14px',
              padding: '12px 14px', marginBottom: '8px',
              border: `1px solid ${player.team !== 'none' ? teamColor + '40' : 'rgba(255,255,255,0.06)'}`,
              transition: 'border-color 0.3s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '50%',
                  background: `${teamColor}28`, border: `2px solid ${teamColor}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1rem', fontWeight: '800', color: teamColor, flexShrink: 0,
                }}>{player.name[0]}</div>
                <div>
                  <div style={{ fontSize: '1.05rem', fontWeight: '700' }}>{player.name}</div>
                  <div style={{ fontSize: '0.8rem', color: teamColor }}>{teamLabel}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => handleAssignTeam(player.clientId, 'team1')} style={{
                  padding: '7px 12px',
                  background: player.team === 'team1' ? '#ff416c' : 'rgba(255,65,108,0.12)',
                  border: '1px solid rgba(255,65,108,0.45)', borderRadius: '9px',
                  color: 'white', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s',
                }}>أحمر</button>
                <button onClick={() => handleAssignTeam(player.clientId, 'team2')} style={{
                  padding: '7px 12px',
                  background: player.team === 'team2' ? '#00b09b' : 'rgba(0,176,155,0.12)',
                  border: '1px solid rgba(0,176,155,0.45)', borderRadius: '9px',
                  color: 'white', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s',
                }}>أخضر</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
