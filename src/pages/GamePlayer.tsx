import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoomStore } from '../store/roomStore';
import { broadcastBuzz } from '../services/realtime';
import { useAudio } from '../hooks/useAudio';
import { useWakeLock } from '../hooks/useWakeLock';
import { Zap, Sun, Moon } from 'lucide-react';

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
  const { isActive: wakeLockActive, toggleWakeLock } = useWakeLock();

  const [buzzed, setBuzzed] = useState(false);
  const [buzzerScale, setBuzzerScale] = useState(1);
  const [isLandscape, setIsLandscape] = useState(false);
  const [hexSize, setHexSize] = useState(60);
  const buzzedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const team = myTeam;
  const teamColor = team === 'team1' ? '#ff416c' : '#00b09b';
  const teamLabel = team === 'team1' ? 'الفريق الأحمر' : 'الفريق الأخضر';

  // Responsive hex sizing
  const calcHexSize = useCallback(() => {
    const ww = window.innerWidth;
    const wh = window.innerHeight;
    const landscape = ww > wh;
    setIsLandscape(landscape);

    const headerHeight = 60;
    const padding = 15;

    if (landscape) {
      const availW = ww * 0.75 - padding * 2;
      const availH = wh - headerHeight - padding * 2;
      const fromW = availW / 4.2;
      const fromH = availH / (5.6 * 0.866);
      setHexSize(Math.max(34, Math.floor(Math.min(fromW, fromH))));
    } else {
      const availW = ww - padding * 2;
      const availH = wh * 0.45 - padding;
      const fromW = availW / 4.2;
      const fromH = availH / (5.6 * 0.866);
      setHexSize(Math.max(32, Math.floor(Math.min(fromW, fromH))));
    }
  }, []);

  useEffect(() => {
    calcHexSize();
    window.addEventListener('resize', calcHexSize);
    return () => window.removeEventListener('resize', calcHexSize);
  }, [calcHexSize]);

  useEffect(() => {
    setBuzzed(false);
    buzzedRef.current = false;
  }, [questionActive, currentQuestion]);

  useEffect(() => {
    if (gamePhase === 'finished' || gamePhase === 'lobby') {
      navigate('/');
    }
  }, [gamePhase, navigate]);

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
    setTimeout(() => setBuzzerScale(1.1), 150);
    setTimeout(() => setBuzzerScale(1), 350);
    await broadcastBuzz(roomCode!, { playerId: clientId, playerName: myName, team, timestamp: Date.now() });
  };

  const firstBuzz = buzzQueue[0];
  const isSyncing = buzzed && !buzzQueue.some(b => b.playerId === clientId);

  const hexSizeFactor = isLandscape ? 1.08 : 1.05;
  const hexH = hexSize * 0.866 * hexSizeFactor;
  const boardW = (4 * 0.75 + 1) * hexSize;
  const boardH = 5.5 * hexH;
  const borderThick = Math.max(16, hexSize * 0.28);

  const BoardSection = (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{ 
        position: 'relative', width: boardW + borderThick * 2, height: boardH + borderThick * 2, 
        borderRadius: '16px', overflow: 'hidden', 
        boxShadow: '0 15px 40px rgba(0,0,0,0.8)',
        border: '1px solid rgba(255,255,255,0.08)' 
      }}>
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: borderThick, background: 'linear-gradient(to bottom, #ff416c, #ff4b2b)', zIndex: 10 }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: borderThick, background: 'linear-gradient(to bottom, #ff416c, #ff4b2b)', zIndex: 10 }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: borderThick, background: 'linear-gradient(to right, #00b09b, #96c93d)', zIndex: 10 }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: borderThick, background: 'linear-gradient(to right, #00b09b, #96c93d)', zIndex: 10 }} />
        
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,12,20,1)', zIndex: 1 }}>
          <div style={{ position: 'absolute', left: borderThick, top: borderThick, width: boardW, height: boardH }}>
          {syncedBoard.map(hex => {
            const isTeam1 = hex.owner === 'team1';
            const isTeam2 = hex.owner === 'team2';
            const bg = isTeam1 
              ? 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)' 
              : isTeam2 
              ? 'linear-gradient(135deg, #00b09b 0%, #96c93d 100%)' 
              : 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)';
            
            return (
              <div key={hex.id} style={{
                position: 'absolute', left: hex.colIndex * (hexSize * 0.75), top: hex.row * hexH,
                width: hexSize, height: hexH,
                clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
                background: bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: isTeam1 || isTeam2 ? 'inset 0 0 12px rgba(0,0,0,0.2)' : '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                zIndex: isTeam1 || isTeam2 ? 10 : 1,
                transform: isTeam1 || isTeam2 ? 'scale(1.02)' : 'scale(1)',
                filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.2))',
              }}>
                <span style={{ 
                  fontSize: `${hexSize * 0.38}px`, fontWeight: '800', 
                  color: isTeam1 || isTeam2 ? 'white' : '#333',
                  textShadow: isTeam1 || isTeam2 ? '1px 1px 2px rgba(0,0,0,0.4)' : '1px 1px 1px rgba(255,255,255,0.8)',
                  fontFamily: "'Cairo', sans-serif"
                }}>{hex.letter}</span>
              </div>
            );
          })}
          </div>
        </div>
      </div>
    </div>
  );

  const SharedBuzzButton = (
    <button
      onClick={handleBuzz}
      disabled={!questionActive || buzzed}
      style={{
        width: '100%', height: isLandscape ? '70px' : '80px', borderRadius: '20px',
        background: !questionActive ? 'rgba(50,50,60,0.5)' : buzzed
          ? 'linear-gradient(135deg, #333, #222)'
          : `linear-gradient(135deg, ${teamColor}, ${team === 'team1' ? '#ff4b2b' : '#96c93d'})`,
        border: questionActive && !buzzed ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.06)',
        color: !questionActive ? '#444' : buzzed ? '#666' : 'white',
        fontSize: '1.8rem', fontWeight: '950', cursor: buzzed ? 'default' : 'pointer',
        boxShadow: questionActive && !buzzed ? `0 12px 35px ${teamColor}66` : 'none',
        transform: `scale(${buzzerScale})`,
        transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        flexShrink: 0,
      }}
    >
      {!questionActive ? '⚡' : buzzed ? '✓' : '⚡ BUZZ!'}
    </button>
  );

  return (
    <div ref={containerRef} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: `radial-gradient(circle at 50% 0%, ${teamColor}12 0%, rgb(8,8,14) 75%)`,
      color: 'white', fontFamily: "'Cairo', sans-serif", direction: 'rtl',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* ── Fixed Header ── */}
      <div style={{
        padding: '8px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)', zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: `${teamColor}22`, border: `2px solid ${teamColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: '900', color: teamColor }}>
            {myName?.[0] ?? '?'}
          </div>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: '900', lineHeight: 1.1 }}>{myName}</div>
            <div style={{ fontSize: '0.65rem', color: teamColor, fontWeight: '700' }}>{teamLabel}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={toggleWakeLock} style={{ background: wakeLockActive ? 'rgba(255,180,0,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${wakeLockActive ? 'rgba(255,180,0,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '8px', padding: '4px 10px', color: wakeLockActive ? '#ffb400' : '#555', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem' }}>
            {wakeLockActive ? <Sun size={12} fill="currentColor" /> : <Moon size={12} />}
            <span>Stay Awake</span>
          </button>
          <div style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.25)', borderRadius: '8px', padding: '2px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.45rem', color: '#ff6b6b', fontWeight: '800' }}>ROOM</div>
            <div style={{ fontSize: '1rem', fontWeight: '950', letterSpacing: '3px', color: '#ff6b6b', lineHeight: 1 }}>{roomCode}</div>
          </div>
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: isLandscape ? 'row' : 'column', alignItems: 'center', gap: '15px', padding: '15px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {syncedBoard.length > 0 && BoardSection}
        </div>
        <div style={{ flex: 1, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '10px', justifyContent: 'center', minWidth: 0 }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { rounds: syncedTeam1Rounds, color: '#ff416c', bg: 'rgba(255,65,108,0.12)', border: 'rgba(255,65,108,0.2)', label: 'أحمر' },
              { rounds: syncedTeam2Rounds, color: '#00b09b', bg: 'rgba(0,176,155,0.12)', border: 'rgba(0,176,155,0.2)', label: 'أخضر' },
            ].map(({ rounds, color, bg, border, label }) => (
              <div key={label} style={{ flex: 1, textAlign: 'center', background: bg, border: `1px solid ${border}`, borderRadius: '10px', padding: '5px 0' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: '900', color, lineHeight: 1 }}>{rounds}</div>
                <div style={{ fontSize: '0.65rem', color, opacity: 0.8, fontWeight: '700' }}>{label}</div>
              </div>
            ))}
          </div>
          
          <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '8px' }}>
            <div style={{ color: syncedTurn === 'team1' ? '#ff416c' : '#00b09b', fontWeight: '900', fontSize: '1rem' }}>
              {syncedTurn === 'team1' ? 'دور الفريق الأحمر' : 'دور الفريق الأخضر'}
            </div>
          </div>
          
          {!questionActive && SharedBuzzButton}
        </div>
      </div>

      {/* ── Question Modal Overlay (Buzz button inside) ── */}
      {questionActive && currentQuestion && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '15px', zIndex: 1000, animation: 'fadeIn 0.2s'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1e2030, #14161f)',
            border: '1px solid rgba(255,255,255,0.12)', borderRadius: '24px',
            padding: '20px', width: '100%', maxWidth: '440px', textAlign: 'center',
            boxShadow: '0 25px 60px rgba(0,0,0,0.6)', animation: 'popUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ width: '36px', height: '36px', background: 'rgba(255,210,0,0.1)', border: '1px solid #ffd200', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffd200', fontSize: '1.2rem', fontWeight: '900' }}>
                {currentQuestion.letter}
              </div>
              <div style={{ color: '#888', fontSize: '0.8rem', fontWeight: '700' }}>سؤال الحرف</div>
            </div>
            
            <div style={{ maxHeight: '35vh', overflowY: 'auto', marginBottom: '20px', padding: '0 5px' }}>
              <p style={{ fontSize: '1.2rem', fontWeight: '800', color: 'white', lineHeight: 1.5, margin: 0 }}>
                {currentQuestion.question}
              </p>
            </div>

            {/* In-Modal Buzz Status */}
            {firstBuzz ? (
              <div style={{ marginBottom: '15px', animation: 'fadeIn 0.3s' }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  background: firstBuzz.team === 'team1' ? 'rgba(255,65,108,0.2)' : 'rgba(0,176,155,0.2)',
                  border: `1px solid ${firstBuzz.team === 'team1' ? 'rgba(255,65,108,0.4)' : 'rgba(0,176,155,0.4)'}`,
                  borderRadius: '12px', padding: '8px 18px',
                  color: firstBuzz.team === 'team1' ? '#ff8585' : '#00ffda',
                  fontSize: '0.95rem', fontWeight: '900',
                }}>
                  <Zap size={16} fill="currentColor" />
                  {firstBuzz.team === 'team1' ? 'الفريق الأحمر هو الذي ضغط أولاً!' : 'الفريق الأخضر هو الذي ضغط أولاً!'}
                </div>
              </div>
            ) : isSyncing ? (
              <div style={{ marginBottom: '15px', color: '#ffb400', fontSize: '0.85rem', fontWeight: '700', animation: 'pulse 1s infinite' }}>جاري المزامنة...</div>
            ) : null}

            {!answerRevealed ? (
              SharedBuzzButton
            ) : (
              <div style={{ background: 'rgba(247,151,30,0.12)', border: '1px solid rgba(247,151,30,0.3)', borderRadius: '16px', padding: '12px', animation: 'fadeIn 0.5s' }}>
                <div style={{ fontSize: '0.7rem', color: '#f7971e', fontWeight: '800', marginBottom: '2px' }}>الجواب</div>
                <div style={{ fontSize: '1.3rem', fontWeight: '950', color: '#ffd200' }}>{revealedAnswer}</div>
                {awardedTeam && awardedTeam !== 'none' && (
                  <div style={{ marginTop: '8px', fontSize: '0.9rem', color: awardedTeam === 'team1' ? '#ff6b6b' : '#00d4b4', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                    <Zap size={14} /> {awardedTeam === 'team1' ? 'نقطة للأحمر!' : 'نقطة للأخضر!'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes popUp   { from { opacity: 0; transform: scale(0.9) translateY(15px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes pulse   { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
};
