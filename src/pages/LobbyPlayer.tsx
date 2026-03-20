import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoomStore } from '../store/roomStore';
import { Clock } from 'lucide-react';

export const LobbyPlayer: React.FC = () => {
  const navigate = useNavigate();
  const { myPlayer, roomCode, gamePhase, players } = useRoomStore();

  // Navigate to game when admin starts
  useEffect(() => {
    if (gamePhase === 'game') {
      navigate('/game-player');
    }
  }, [gamePhase, navigate]);

  const team = myPlayer?.team ?? 'none';
  const teamColor = team === 'team1' ? '#ff416c' : team === 'team2' ? '#00b09b' : '#888';
  const teamLabel = team === 'team1' ? 'الفريق الأحمر 🔴' : team === 'team2' ? 'الفريق الأخضر 🟢' : 'في انتظار التقسيم...';

  const teammates = players.filter(p => p.team === team && p.id !== myPlayer?.id);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: `radial-gradient(circle at 50% 30%, ${team !== 'none' ? teamColor + '22' : 'rgb(20,20,30)'} 0%, rgb(8,8,15) 100%)`,
      color: 'white', fontFamily: "'Cairo', sans-serif", direction: 'rtl',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px', gap: '24px',
      transition: 'background 0.8s ease',
    }}>
      {/* Room code */}
      <div style={{ position: 'absolute', top: '20px', right: '24px',
        background: 'rgba(255,255,255,0.07)', borderRadius: '10px', padding: '6px 14px',
        fontSize: '0.85rem', color: '#777', letterSpacing: '3px',
      }}>
        {roomCode}
      </div>

      {/* Player name & avatar */}
      <div style={{ textAlign: 'center', animation: 'fadeInDown 0.7s ease-out' }}>
        <div style={{
          width: '90px', height: '90px', borderRadius: '50%', margin: '0 auto 16px',
          background: `linear-gradient(135deg, ${teamColor}44, ${teamColor}22)`,
          border: `3px solid ${teamColor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2.5rem', fontWeight: '800', color: teamColor,
          boxShadow: `0 10px 30px ${teamColor}44`,
        }}>
          {myPlayer?.name?.[0] ?? '?'}
        </div>
        <h2 style={{ margin: '0 0 6px', fontSize: '1.8rem', fontWeight: '900' }}>{myPlayer?.name ?? 'لاعب'}</h2>
      </div>

      {/* Team Status */}
      <div style={{
        background: team !== 'none' ? `${teamColor}22` : 'rgba(255,255,255,0.05)',
        border: `1px solid ${teamColor}55`,
        borderRadius: '16px', padding: '18px 30px', textAlign: 'center',
        minWidth: '280px', transition: 'all 0.5s',
      }}>
        <div style={{ fontSize: '1rem', color: '#aaa', marginBottom: '6px' }}>فريقك</div>
        <div style={{ fontSize: '1.6rem', fontWeight: '900', color: teamColor }}>{teamLabel}</div>
        {teammates.length > 0 && (
          <div style={{ marginTop: '10px', fontSize: '0.9rem', color: '#888' }}>
            زملاؤك: {teammates.map(p => p.name).join('، ')}
          </div>
        )}
      </div>

      {/* Waiting indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#555', fontSize: '1rem', animation: 'pulse 2s ease-in-out infinite' }}>
        <Clock size={20} />
        في انتظار بدء المدير للعبة...
      </div>

      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};
