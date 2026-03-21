import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoomStore } from '../store/roomStore';
import { broadcastBuzz } from '../services/realtime';
import { useAudio } from '../hooks/useAudio';
import { useWakeLock } from '../hooks/useWakeLock';
import { Zap, Sun, Moon } from 'lucide-react';
import { Hexagon } from '../components/Hexagon';

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
  const [timeLeft, setTimeLeft] = useState(20);
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
    if (questionActive) {
      setTimeLeft(20);
    }
  }, [questionActive]);

  // Player-side Timer logic
  useEffect(() => {
    if (!questionActive || buzzed || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [questionActive, buzzed, timeLeft]);

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
    <div style={{ position: 'relative', flexShrink: 0, '--hex-size': `${hexSize}px` } as React.CSSProperties}>
      <div className="game-board" style={{ 
        width: boardW, height: boardH, position: 'relative'
      }}>
        {/* Background borders - Proportioned to match Board.tsx */}
        <div style={{ position: 'absolute', top: -borderThick, left: -borderThick, right: -borderThick, bottom: -borderThick, zIndex: 0, borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: hexSize * 0.44, background: 'linear-gradient(to bottom, #ff416c, #ff4b2b)', boxShadow: '4px 0 10px rgba(255,65,108,0.2)' }} />
          <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: hexSize * 0.44, background: 'linear-gradient(to bottom, #ff416c, #ff4b2b)', boxShadow: '-4px 0 10px rgba(255,65,108,0.2)' }} />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: hexSize * 0.75, background: 'linear-gradient(to right, #00b09b, #96c93d)', boxShadow: '0 4px 10px rgba(0,176,155,0.2)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: hexSize * 0.75, background: 'linear-gradient(to right, #00b09b, #96c93d)', boxShadow: '0 -4px 10px rgba(0,176,155,0.2)' }} />
        </div>

        <div className="hex-grid" style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%' }}>
          {syncedBoard.map(hex => (
            <div key={hex.id} style={{ position: 'absolute', left: hex.colIndex * (hexSize * 0.75), top: hex.row * hexH }}>
              <Hexagon letter={hex.letter} owner={hex.owner as any} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const SharedBuzzButton = (
    <button
      onClick={handleBuzz}
      disabled={!questionActive || buzzed}
      style={{
        width: '100%', height: isLandscape ? '70px' : '80px', borderRadius: '24px',
        background: !questionActive ? '#f1f3f5' : buzzed
          ? 'linear-gradient(135deg, #ddd, #eee)'
          : `linear-gradient(135deg, ${teamColor}, ${team === 'team1' ? '#ff4b2b' : '#96c93d'})`,
        border: '1px solid var(--glass-border)',
        color: !questionActive ? '#ccc' : buzzed ? '#999' : 'white',
        fontSize: '1.8rem', fontWeight: '950', cursor: buzzed ? 'default' : 'pointer',
        boxShadow: questionActive && !buzzed ? `0 12px 30px ${teamColor}44` : 'none',
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
      background: 'var(--bg-main)',
      color: 'var(--text-primary)', fontFamily: "'Cairo', sans-serif", direction: 'rtl',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* ── Fixed Header ── */}
      <div className="glass-panel" style={{
        padding: '8px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--glass-border)', zIndex: 100,
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
          <button onClick={toggleWakeLock} style={{ background: wakeLockActive ? 'rgba(255,180,0,0.1)' : 'white', border: `1px solid ${wakeLockActive ? '#ffb400' : 'var(--glass-border)'}`, borderRadius: '8px', padding: '4px 10px', color: wakeLockActive ? '#ffb400' : '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', boxShadow: 'var(--shadow-sm)' }}>
            {wakeLockActive ? <Sun size={12} fill="currentColor" /> : <Moon size={12} />}
            <span>Stay Awake</span>
          </button>
          <div style={{ background: 'white', border: '1px solid #ff6b6b44', borderRadius: '8px', padding: '2px 10px', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
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
          
          <div className="glass-panel" style={{ textAlign: 'center', borderRadius: '12px', padding: '8px' }}>
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
          background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '15px', zIndex: 1000, animation: 'fadeIn 0.2s'
        }}>
          <div className="glass-panel" style={{
            background: 'white', borderRadius: '32px',
            padding: '24px', width: '100%', maxWidth: '440px', textAlign: 'center',
            boxShadow: 'var(--shadow-lg)', animation: 'popUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ width: '38px', height: '38px', background: 'var(--team2-light)', border: '1px solid var(--team2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--team2)', fontSize: '1.2rem', fontWeight: '900' }}>
                {currentQuestion.letter}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '800' }}>سؤال الحرف</div>
            </div>

            {/* Timer for Player */}
            {!buzzed && !answerRevealed && (
              <div style={{ width: '100%', height: '6px', background: '#f1f3f5', borderRadius: '10px', overflow: 'hidden', margin: '10px 0 20px', border: '1px solid rgba(0,0,0,0.03)' }}>
                <div style={{
                  height: '100%',
                  width: `${(timeLeft / 20) * 100}%`,
                  background: timeLeft <= 5 ? 'var(--team1)' : 'var(--team2)',
                  transition: 'width 1s linear'
                }} />
              </div>
            )}
            
            <div style={{ maxHeight: '35vh', overflowY: 'auto', marginBottom: '25px', padding: '0 5px' }}>
              <p style={{ fontSize: '1.3rem', fontWeight: '900', color: 'var(--text-primary)', lineHeight: 1.5, margin: 0 }}>
                {currentQuestion.question}
              </p>
            </div>

            {/* In-Modal Buzz Status */}
            {firstBuzz ? (
              <div style={{ marginBottom: '20px', animation: 'fadeIn 0.3s' }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  background: firstBuzz.team === 'team1' ? 'var(--team1-light)' : 'var(--team2-light)',
                  border: `1px solid ${firstBuzz.team === 'team1' ? '#ff416c66' : '#00b09b66'}`,
                  borderRadius: '16px', padding: '10px 20px',
                  color: firstBuzz.team === 'team1' ? '#ff416c' : '#00b09b',
                  fontSize: '1rem', fontWeight: '900',
                }}>
                  <Zap size={18} fill="currentColor" />
                  {firstBuzz.playerName} ضغط أولاً!
                </div>
              </div>
            ) : isSyncing ? (
              <div style={{ marginBottom: '20px', color: '#ffb400', fontSize: '0.9rem', fontWeight: '900', animation: 'pulse 1s infinite' }}>جاري المزامنة...</div>
            ) : null}

            {!answerRevealed ? (
              SharedBuzzButton
            ) : (
              <div style={{ background: '#f8f9fa', border: '1px solid var(--glass-border)', borderRadius: '20px', padding: '16px', animation: 'fadeIn 0.5s' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '800', marginBottom: '4px' }}>الجواب</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '950', color: '#111' }}>{revealedAnswer}</div>
                {awardedTeam && awardedTeam !== 'none' && (
                  <div style={{ marginTop: '10px', fontSize: '1rem', color: awardedTeam === 'team1' ? '#ff416c' : '#00b09b', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <Zap size={16} fill="currentColor" /> {awardedTeam === 'team1' ? 'نقطة للأحمر!' : 'نقطة للأخضر!'}
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
