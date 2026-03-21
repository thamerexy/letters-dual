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
      background: 'var(--bg-main)',
      color: 'var(--text-primary)', fontFamily: "'Cairo', sans-serif", direction: 'rtl',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px', gap: '20px',
      transition: 'background 1s ease',
    }}>
      {/* Avatar */}
      <div style={{ textAlign: 'center', animation: 'fadeInDown 0.7s ease-out' }}>
        <div style={{
          width: '100px', height: '100px', borderRadius: '50%', margin: '0 auto 16px',
          background: myTeam !== 'none' ? `${teamColor}15` : 'white', 
          border: `3px solid ${myTeam !== 'none' ? teamColor : 'var(--glass-border)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2.8rem', fontWeight: '950', color: teamColor,
          boxShadow: 'var(--shadow-lg)', transition: 'all 0.6s',
        }}>{myName?.[0] ?? '?'}</div>
        <h2 style={{ margin: '0 0 4px', fontSize: '1.8rem', fontWeight: '950', color: 'var(--text-primary)' }}>{myName}</h2>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '800' }}>قاعة الانتظار الاستباقية</div>
      </div>

      {/* Team status */}
      <div className="glass-panel" style={{
        background: myTeam !== 'none' ? `${teamColor}10` : 'white',
        border: `1px solid ${myTeam !== 'none' ? teamColor + '33' : 'var(--glass-border)'}`,
        borderRadius: '24px', padding: '20px 32px', textAlign: 'center',
        minWidth: '280px', transition: 'all 0.5s', boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '800', marginBottom: '4px' }}>حالة الفريق</div>
        <div style={{ fontSize: '1.6rem', fontWeight: '950', color: teamColor }}>{teamLabel}</div>
        {teammates.length > 0 && (
          <div style={{ marginTop: '10px', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '700' }}>
            زملاؤك في الفريق: {teammates.map(p => p.name).join('، ')}
          </div>
        )}
      </div>

      {/* Waiting Status */}
      <div style={{ textAlign: 'center', marginTop: '10px' }}>
        {gamePhase === 'game' && myTeam === 'none' ? (
          <div style={{ color: 'var(--team1)', fontSize: '1.1rem', fontWeight: '900', animation: 'pulse 1.5s infinite' }}>
            ⚠️ اللعبة بدأت! انتظر المدير ليضمك لفريق...
          </div>
        ) : (
          <div style={{ color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: '800', animation: 'pulse 2.5s ease-in-out infinite', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--team2)' }}></span>
            بانتظار تعليمات إدارة المباراة...
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
