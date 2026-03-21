import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoomStore } from '../store/roomStore';

export const LobbyPlayer: React.FC = () => {
  const navigate = useNavigate();
  const { myName, myTeam, gamePhase, players, clientId } = useRoomStore();

  // Navigate to game when game is active AND player has been assigned a team
  useEffect(() => {
    if (gamePhase === 'game' && myTeam !== 'none') {
      navigate('/game-player');
    }
  }, [gamePhase, myTeam, navigate]);

  const teamColor = myTeam === 'team1' ? '#ff416c' : myTeam === 'team2' ? '#00b09b' : '#666';
  const teamLabel = myTeam === 'team1' ? 'الفريق الأحمر 🔴' : myTeam === 'team2' ? 'الفريق الأخضر 🟢' : 'انتظر التقسيم...';
  const teammates = players.filter(p => p.team === myTeam && p.clientId !== clientId);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: `radial-gradient(circle at 50% 30%, ${myTeam !== 'none' ? teamColor + '20' : 'rgba(18,20,30,1)'} 0%, rgb(8,8,15) 100%)`,
      color: 'white', fontFamily: "'Cairo', sans-serif", direction: 'rtl',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px', gap: '20px',
      transition: 'background 1s ease',
    }}>
      {/* Avatar */}
      <div style={{ textAlign: 'center', animation: 'fadeInDown 0.7s ease-out' }}>
        <div style={{
          width: '86px', height: '86px', borderRadius: '50%', margin: '0 auto 14px',
          background: `${teamColor}28`, border: `3px solid ${teamColor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2.4rem', fontWeight: '800', color: teamColor,
          boxShadow: `0 8px 28px ${teamColor}40`, transition: 'all 0.6s',
        }}>{myName?.[0] ?? '?'}</div>
        <h2 style={{ margin: '0 0 4px', fontSize: '1.75rem', fontWeight: '900' }}>{myName}</h2>
      </div>

      {/* Team status */}
      <div style={{
        background: myTeam !== 'none' ? `${teamColor}18` : 'rgba(255,255,255,0.04)',
        border: `1px solid ${teamColor}44`,
        borderRadius: '16px', padding: '16px 28px', textAlign: 'center',
        minWidth: '260px', transition: 'all 0.5s',
      }}>
        <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '5px' }}>فريقك</div>
        <div style={{ fontSize: '1.5rem', fontWeight: '900', color: teamColor }}>{teamLabel}</div>
        {teammates.length > 0 && (
          <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#777' }}>
            زملاؤك: {teammates.map(p => p.name).join('، ')}
          </div>
        )}
      </div>

      {/* Waiting Status */}
      <div style={{ textAlign: 'center', marginTop: '10px' }}>
        {gamePhase === 'game' && myTeam === 'none' ? (
          <div style={{ color: '#f7971e', fontSize: '1.1rem', fontWeight: '700', animation: 'pulse 1.5s infinite' }}>
            ⚠️ اللعبة بدأت! انتظر المدير ليضمك لفريق...
          </div>
        ) : (
          <div style={{ color: '#444', fontSize: '0.95rem', animation: 'pulse 2.5s ease-in-out infinite' }}>
            ⏳ في انتظار بدء المدير للعبة...
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeInDown { from { opacity:0; transform:translateY(-18px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { opacity:0.4; } 50% { opacity:1; } }
      `}</style>
    </div>
  );
};
