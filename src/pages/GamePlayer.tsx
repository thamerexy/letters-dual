import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoomStore } from '../store/roomStore';
import { broadcastBuzz } from '../services/realtime';
import { useAudio } from '../hooks/useAudio';

export const GamePlayer: React.FC = () => {
  const navigate = useNavigate();
  const {
    myName, myTeam, clientId, roomCode,
    currentQuestion, questionActive,
    answerRevealed, awardedTeam, revealedAnswer,
    buzzQueue, gamePhase,
    syncedBoard, syncedTurn,
    syncedTeam1Rounds, syncedTeam2Rounds,
  } = useRoomStore();
  const { playClick, playWin } = useAudio();

  const [buzzed, setBuzzed] = useState(false);
  const [buzzerScale, setBuzzerScale] = useState(1);
  const buzzedRef = useRef(false);

  const team = myTeam;
  const teamColor = team === 'team1' ? '#ff416c' : '#00b09b';
  const teamLabel = team === 'team1' ? 'الفريق الأحمر' : 'الفريق الأخضر';

  // Reset buzz when new question appears
  useEffect(() => {
    setBuzzed(false);
    buzzedRef.current = false;
  }, [questionActive, currentQuestion]);

  // Go back to home if game ends
  useEffect(() => {
    if (gamePhase === 'finished' || gamePhase === 'lobby') navigate('/');
  }, [gamePhase, navigate]);

  // Win sound when own team is awarded
  useEffect(() => {
    if (answerRevealed && awardedTeam === team && team !== 'none') playWin();
  }, [answerRevealed, awardedTeam, team, playWin]);

  const handleBuzz = async () => {
    if (!questionActive || buzzed || buzzedRef.current) return;
    buzzedRef.current = true;
    setBuzzed(true);
    playClick();
    if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
    setBuzzerScale(0.88);
    setTimeout(() => setBuzzerScale(1.08), 150);
    setTimeout(() => setBuzzerScale(1), 300);

    await broadcastBuzz(roomCode!, {
      playerId: clientId, playerName: myName, team, timestamp: Date.now(),
    });
  };

  const firstBuzz = buzzQueue[0];
  const myBuzzRank = buzzQueue.findIndex(b => b.playerId === clientId);

  const hexW = 54, hexH = 46.8;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: `radial-gradient(circle at 50% 0%, ${teamColor}16 0%, rgb(8,8,15) 65%)`,
      color: 'white', fontFamily: "'Cairo', sans-serif", direction: 'rtl',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Top bar */}
      <div style={{ padding: '12px 14px 8px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: `${teamColor}28`, border: `2px solid ${teamColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: '800', color: teamColor }}>
            {myName?.[0] ?? '?'}
          </div>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: '700' }}>{myName}</div>
            <div style={{ fontSize: '0.7rem', color: teamColor }}>{teamLabel}</div>
          </div>
        </div>
        {/* Scores */}
        <div style={{ display: 'flex', gap: '6px', direction: 'ltr' }}>
          <div style={{ textAlign: 'center', background: 'rgba(255,65,108,0.14)', border: '1px solid rgba(255,65,108,0.28)', borderRadius: '9px', padding: '3px 10px' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#ff416c' }}>{syncedTeam1Rounds}</div>
            <div style={{ fontSize: '0.6rem', color: '#ff416c' }}>أحمر</div>
          </div>
          <div style={{ textAlign: 'center', background: 'rgba(0,176,155,0.14)', border: '1px solid rgba(0,176,155,0.28)', borderRadius: '9px', padding: '3px 10px' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#00b09b' }}>{syncedTeam2Rounds}</div>
            <div style={{ fontSize: '0.6rem', color: '#00b09b' }}>أخضر</div>
          </div>
        </div>
      </div>

      {/* Turn */}
      {!questionActive && (
        <div style={{ padding: '6px 14px', flexShrink: 0, textAlign: 'center', fontSize: '0.85rem', color: '#666' }}>
          دور الاختيار:{' '}
          <span style={{ color: syncedTurn === 'team1' ? '#ff416c' : '#00b09b', fontWeight: '700' }}>
            {syncedTurn === 'team1' ? 'الأحمر' : 'الأخضر'}
          </span>
        </div>
      )}

      {/* Mini board */}
      {syncedBoard.length > 0 && (
        <div style={{ flexShrink: 0, padding: '0 14px 4px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: (4 * 0.75 + 1) * hexW, height: 5.5 * hexH }}>
            {syncedBoard.map(hex => {
              const bg = hex.owner === 'team1' ? 'rgba(255,65,108,0.75)' : hex.owner === 'team2' ? 'rgba(0,176,155,0.75)' : 'rgba(55,55,65,0.8)';
              return (
                <div key={hex.id} style={{
                  position: 'absolute',
                  left: hex.colIndex * (hexW * 0.75),
                  top: hex.row * hexH,
                  width: hexW, height: hexH,
                  clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
                  background: bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: '800', color: 'white',
                  transition: 'background 0.4s',
                }}>{hex.letter}</div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 14px 10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

        {/* Question card */}
        {questionActive && currentQuestion && (
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '14px', padding: '16px', textAlign: 'center', animation: 'fadeInDown 0.4s ease-out' }}>
            <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '6px' }}>
              حرف <span style={{ color: '#f7971e', fontWeight: '800', fontSize: '0.95rem' }}>{currentQuestion.letter}</span>
            </div>
            <p style={{ fontSize: '1.15rem', fontWeight: '800', color: '#fff', margin: 0, lineHeight: '1.65' }}>
              {currentQuestion.question}
            </p>

            {answerRevealed && (
              <div style={{ marginTop: '12px', background: 'rgba(247,151,30,0.14)', border: '1px solid rgba(247,151,30,0.35)', borderRadius: '10px', padding: '10px', animation: 'fadeIn 0.5s ease-out' }}>
                <div style={{ fontSize: '0.75rem', color: '#f7971e', marginBottom: '3px' }}>الجواب</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#ffd200' }}>{revealedAnswer}</div>
                {awardedTeam && awardedTeam !== 'none' && (
                  <div style={{ marginTop: '6px', fontSize: '0.9rem', color: awardedTeam === 'team1' ? '#ff6b6b' : '#00d4b4', fontWeight: '700' }}>
                    🏆 {awardedTeam === 'team1' ? 'الفريق الأحمر فاز' : 'الفريق الأخضر فاز'}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Buzz result */}
        {firstBuzz && questionActive && (
          <div style={{ textAlign: 'center', animation: 'fadeIn 0.35s ease-out' }}>
            <div style={{
              display: 'inline-block',
              background: firstBuzz.team === 'team1' ? 'rgba(255,65,108,0.18)' : 'rgba(0,176,155,0.18)',
              border: `1px solid ${firstBuzz.team === 'team1' ? 'rgba(255,65,108,0.45)' : 'rgba(0,176,155,0.45)'}`,
              borderRadius: '12px', padding: '8px 18px',
              color: firstBuzz.team === 'team1' ? '#ff6b6b' : '#00d4b4',
              fontSize: '0.95rem', fontWeight: '800',
            }}>
              {firstBuzz.playerId === clientId ? '⚡ أنت ضغطت أولاً!' : `⚡ ${firstBuzz.playerName} ضغط أولاً!`}
            </div>
            {myBuzzRank > 0 && (
              <div style={{ marginTop: '5px', fontSize: '0.8rem', color: '#555' }}>أنت في المرتبة #{myBuzzRank + 1}</div>
            )}
          </div>
        )}
      </div>

      {/* BUZZER */}
      <div style={{ padding: '10px 20px 26px', flexShrink: 0, textAlign: 'center', background: 'linear-gradient(to top, rgba(0,0,0,0.45), transparent)' }}>
        <button
          onClick={handleBuzz}
          disabled={!questionActive || buzzed}
          style={{
            width: '100%', maxWidth: '340px', height: '84px', borderRadius: '20px',
            background: !questionActive ? 'rgba(40,40,50,0.7)' : buzzed
              ? 'linear-gradient(135deg, #444, #333)'
              : `linear-gradient(135deg, ${teamColor}, ${team === 'team1' ? '#ff4b2b' : '#96c93d'})`,
            border: 'none',
            color: !questionActive ? '#444' : buzzed ? '#777' : 'white',
            fontSize: !questionActive ? '1rem' : '1.7rem',
            fontWeight: '900', letterSpacing: '2px',
            cursor: !questionActive || buzzed ? 'not-allowed' : 'pointer',
            boxShadow: questionActive && !buzzed ? `0 14px 36px ${teamColor}55` : 'none',
            transform: `scale(${buzzerScale})`,
            transition: 'transform 0.15s, background 0.3s, box-shadow 0.3s',
          }}
        >
          {!questionActive ? 'انتظر السؤال...' : buzzed ? '✓ تم الضغط!' : '⚡  BUZZ!'}
        </button>
      </div>

      <style>{`
        @keyframes fadeInDown { from { opacity:0; transform:translateY(-18px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
      `}</style>
    </div>
  );
};
