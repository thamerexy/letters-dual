import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoomStore } from '../store/roomStore';
import { broadcastBuzz } from '../services/realtime';
import { useGameStore } from '../store/gameStore';
import { useAudio } from '../hooks/useAudio';

export const GamePlayer: React.FC = () => {
  const navigate = useNavigate();
  const {
    myPlayer, currentQuestion, questionActive,
    answerRevealed, awardedTeam, buzzQueue, roomCode, clientId,
    gamePhase,
  } = useRoomStore();
  const { board, team1RoundsWon, team2RoundsWon, requiredRoundsToWin, currentTurn } = useGameStore();
  const { playClick, playWin } = useAudio();

  const [buzzed, setBuzzed] = useState(false);
  const [buzzerScale, setBuzzerScale] = useState(1);
  const buzzedRef = useRef(false);

  const team = myPlayer?.team ?? 'none';
  const teamColor = team === 'team1' ? '#ff416c' : '#00b09b';
  const teamLabel = team === 'team1' ? 'الفريق الأحمر' : 'الفريق الأخضر';

  // Reset buzz state when question changes
  useEffect(() => {
    setBuzzed(false);
    buzzedRef.current = false;
  }, [questionActive, currentQuestion]);

  // Navigate away if game finishes
  useEffect(() => {
    if (gamePhase === 'finished' || gamePhase === 'lobby') {
      navigate('/');
    }
  }, [gamePhase, navigate]);

  // Play win sound when answer is revealed and own team won
  useEffect(() => {
    if (answerRevealed && awardedTeam === team && team !== 'none') {
      playWin();
    }
  }, [answerRevealed, awardedTeam, team, playWin]);

  const handleBuzz = async () => {
    if (!questionActive || buzzed || buzzedRef.current || !myPlayer) return;
    buzzedRef.current = true;
    setBuzzed(true);
    playClick();

    // Haptic feedback (mobile)
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

    // Animate buzzer
    setBuzzerScale(0.85);
    setTimeout(() => setBuzzerScale(1.1), 150);
    setTimeout(() => setBuzzerScale(1), 300);

    await broadcastBuzz(roomCode!, {
      playerId: clientId,
      playerName: myPlayer.name,
      team,
      timestamp: Date.now(),
    });
  };

  const firstBuzz = buzzQueue[0];
  const myBuzzRank = buzzQueue.findIndex(b => b.playerId === clientId);

  // Compute board hex layout for a read-only mini display
  const hexWidth = 56;
  const hexHeight = 48.5;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: `radial-gradient(circle at 50% 0%, ${teamColor}18 0%, rgb(8,8,15) 60%)`,
      color: 'white', fontFamily: "'Cairo', sans-serif", direction: 'rtl',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Top Bar */}
      <div style={{
        padding: '14px 16px 10px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: `${teamColor}33`, border: `2px solid ${teamColor}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.9rem', fontWeight: '800', color: teamColor,
          }}>
            {myPlayer?.name?.[0] ?? '?'}
          </div>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: '700' }}>{myPlayer?.name}</div>
            <div style={{ fontSize: '0.75rem', color: teamColor }}>{teamLabel}</div>
          </div>
        </div>

        {/* Scoreboard */}
        <div style={{ display: 'flex', gap: '8px', direction: 'ltr' }}>
          <div style={{ textAlign: 'center', background: 'rgba(255,65,108,0.15)', border: '1px solid rgba(255,65,108,0.3)', borderRadius: '10px', padding: '4px 12px' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#ff416c' }}>{team1RoundsWon}</div>
            <div style={{ fontSize: '0.65rem', color: '#ff416c' }}>أحمر</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', color: '#444', fontSize: '0.8rem' }}>/{requiredRoundsToWin}</div>
          <div style={{ textAlign: 'center', background: 'rgba(0,176,155,0.15)', border: '1px solid rgba(0,176,155,0.3)', borderRadius: '10px', padding: '4px 12px' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#00b09b' }}>{team2RoundsWon}</div>
            <div style={{ fontSize: '0.65rem', color: '#00b09b' }}>أخضر</div>
          </div>
        </div>
      </div>

      {/* Turn Indicator */}
      <div style={{
        padding: '8px 16px', flexShrink: 0, textAlign: 'center',
        fontSize: '0.9rem', color: '#888',
      }}>
        {!questionActive && (
          <span>
            دور اختيار الحرف:{' '}
            <span style={{ color: currentTurn === 'team1' ? '#ff416c' : '#00b09b', fontWeight: '700' }}>
              {currentTurn === 'team1' ? 'الفريق الأحمر' : 'الفريق الأخضر'}
            </span>
          </span>
        )}
      </div>

      {/* Mini Board */}
      <div style={{ flexShrink: 0, padding: '0 16px', display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
        <div style={{ position: 'relative', width: (4 * 0.75 + 1) * hexWidth, height: 5.5 * hexHeight }}>
          {board.map(hex => {
            const left = hex.colIndex * (hexWidth * 0.75);
            const top = hex.row * hexHeight;
            const bgColor = hex.owner === 'team1' ? 'rgba(255,65,108,0.7)' : hex.owner === 'team2' ? 'rgba(0,176,155,0.7)' : 'rgba(60,60,70,0.8)';
            return (
              <div key={hex.id} style={{
                position: 'absolute', left, top,
                width: hexWidth, height: hexHeight,
                clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
                background: bgColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.8rem', fontWeight: '800', color: 'white',
                transition: 'background 0.4s',
              }}>
                {hex.letter}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Question area */}
        {questionActive && currentQuestion && (
          <div style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px', padding: '18px', textAlign: 'center',
            animation: 'fadeInDown 0.5s ease-out',
          }}>
            <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '8px' }}>
              حرف <span style={{ color: '#f7971e', fontWeight: '800', fontSize: '1rem' }}>{currentQuestion.letter}</span>
            </div>
            <p style={{ fontSize: '1.2rem', fontWeight: '800', color: '#fff', margin: '0', lineHeight: '1.6' }}>
              {currentQuestion.question}
            </p>

            {answerRevealed && (
              <div style={{
                marginTop: '14px', background: 'rgba(247,151,30,0.15)',
                border: '1px solid rgba(247,151,30,0.4)', borderRadius: '12px', padding: '12px',
                animation: 'fadeIn 0.5s ease-out',
              }}>
                <div style={{ fontSize: '0.8rem', color: '#f7971e', marginBottom: '4px' }}>الجواب</div>
                <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#ffd200' }}>
                  {currentQuestion.answer}
                </div>
                {awardedTeam && awardedTeam !== 'none' && (
                  <div style={{ marginTop: '8px', fontSize: '0.9rem', color: awardedTeam === 'team1' ? '#ff416c' : '#00b09b', fontWeight: '700' }}>
                    🏆 فاز {awardedTeam === 'team1' ? 'الفريق الأحمر' : 'الفريق الأخضر'}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Buzz status */}
        {firstBuzz && questionActive && (
          <div style={{ textAlign: 'center', animation: 'fadeIn 0.4s ease-out' }}>
            <div style={{
              display: 'inline-block',
              background: firstBuzz.team === 'team1' ? 'rgba(255,65,108,0.2)' : 'rgba(0,176,155,0.2)',
              border: `1px solid ${firstBuzz.team === 'team1' ? 'rgba(255,65,108,0.5)' : 'rgba(0,176,155,0.5)'}`,
              borderRadius: '12px', padding: '10px 20px',
              color: firstBuzz.team === 'team1' ? '#ff6b6b' : '#00d4b4',
              fontSize: '1rem', fontWeight: '800',
            }}>
              {firstBuzz.playerId === clientId ? '⚡ أنت ضغطت أولاً!' : `⚡ ${firstBuzz.playerName} ضغط أولاً!`}
            </div>
            {myBuzzRank > 0 && (
              <div style={{ marginTop: '6px', fontSize: '0.85rem', color: '#666' }}>
                أنت في المرتبة #{myBuzzRank + 1}
              </div>
            )}
          </div>
        )}
      </div>

      {/* BUZZER BUTTON */}
      <div style={{
        padding: '12px 24px 28px', flexShrink: 0, textAlign: 'center',
        background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)',
      }}>
        <button
          onClick={handleBuzz}
          disabled={!questionActive || buzzed}
          style={{
            width: '100%', maxWidth: '340px',
            height: '90px',
            borderRadius: '20px',
            background: !questionActive
              ? 'rgba(50,50,60,0.6)'
              : buzzed
                ? 'linear-gradient(135deg, #555, #444)'
                : `linear-gradient(135deg, ${teamColor}, ${team === 'team1' ? '#ff4b2b' : '#96c93d'})`,
            border: 'none',
            color: !questionActive ? '#555' : buzzed ? '#888' : 'white',
            fontSize: !questionActive ? '1.1rem' : '1.8rem',
            fontWeight: '900',
            cursor: !questionActive || buzzed ? 'not-allowed' : 'pointer',
            boxShadow: questionActive && !buzzed
              ? `0 15px 40px ${teamColor}66`
              : 'none',
            transform: `scale(${buzzerScale})`,
            transition: 'transform 0.15s, background 0.3s, box-shadow 0.3s',
            letterSpacing: '2px',
          }}
        >
          {!questionActive ? 'انتظر السؤال...' : buzzed ? '✓ ضغطت!' : '⚡ BUZZ!'}
        </button>
      </div>

      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  );
};
