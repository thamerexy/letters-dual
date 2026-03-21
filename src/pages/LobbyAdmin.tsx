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

  const canStart = true; // Allow admin to start anytime as per user request

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
      background: 'var(--bg-main)',
      color: 'var(--text-primary)', fontFamily: "'Cairo', sans-serif", direction: 'rtl',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '20px', flexShrink: 0, borderBottom: '1px solid var(--glass-border)', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '950' }}>لوبي المدير</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '800' }}>
            <Users size={18} />
            {players.length} لاعب متصل
          </div>
        </div>

        {/* Room Code */}
        <div style={{
          background: 'white', border: '1px solid var(--glass-border)',
          borderRadius: '20px', padding: '16px 20px', marginBottom: '16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '800', marginBottom: '2px' }}>رمز الغرفة</div>
            <div style={{ fontSize: '2.8rem', fontWeight: '950', letterSpacing: '12px', color: '#ff416c', lineHeight: 1 }}>{roomCode}</div>
          </div>
          <button onClick={handleCopyCode} style={{
            background: copied ? 'var(--team2-light)' : '#f1f3f5',
            border: `1px solid ${copied ? 'var(--team2)' : 'var(--glass-border)'}`, borderRadius: '12px',
            color: copied ? 'var(--team2)' : '#666', padding: '12px', cursor: 'pointer', transition: 'all 0.25s',
          }}>
            {copied ? <Check size={22} /> : <Copy size={22} />}
          </button>
        </div>

        {/* Start Button */}
        <button onClick={handleStartGame} disabled={!canStart} style={{
          width: '100%', padding: '18px',
          background: canStart ? 'linear-gradient(135deg, #1e2030, #14161f)' : '#eee',
          border: 'none', borderRadius: '18px',
          color: canStart ? 'white' : '#999',
          fontSize: '1.3rem', fontWeight: '950', cursor: canStart ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
          marginBottom: '16px',
          boxShadow: canStart ? '0 10px 24px rgba(0,0,0,0.15)' : 'none',
          transition: 'all 0.3s',
        }}>
          <Play size={24} fill={canStart ? 'currentColor' : 'none'} />
          {canStart ? 'ابدأ المباراة الآن!' : players.length === 0 ? 'انتظر انضمام لاعبين...' : 'بانتظام توزيع الفرق'}
        </button>

        {/* Team counts */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
          {[
            { label: 'غير موزع', count: unassigned.length, color: '#888', bg: 'rgba(0,0,0,0.03)' },
            { label: 'الأحمر', count: redTeam.length, color: '#ff416c', bg: 'var(--team1-light)' },
            { label: 'الأخضر', count: greenTeam.length, color: '#00b09b', bg: 'var(--team2-light)' },
          ].map(({ label, count, color, bg }) => (
            <div key={label} style={{ flex: 1, background: bg, border: `1px solid ${color}22`, borderRadius: '14px', padding: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: '950', color }}>{count}</div>
              <div style={{ fontSize: '0.75rem', color, opacity: 0.8, fontWeight: '800' }}>{label}</div>
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
                  width: '42px', height: '42px', borderRadius: '50%',
                  background: `${teamColor}15`, border: `2px solid ${teamColor}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.1rem', fontWeight: '950', color: teamColor, flexShrink: 0,
                }}>{player.name[0]}</div>
                <div>
                  <div style={{ fontSize: '1.15rem', fontWeight: '900', color: 'var(--text-primary)' }}>{player.name}</div>
                  <div style={{ fontSize: '0.8rem', color: teamColor, fontWeight: '800' }}>{teamLabel}</div>
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
