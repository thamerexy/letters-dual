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
    syncedBoard, syncedTurn, matchWinner, hideQuestionFromPlayers,
    syncedTeam1Rounds, syncedTeam2Rounds,
  } = useRoomStore();
  
  const { playClick, playWin, playRed, playGreen } = useAudio();
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

    const padding = 15;
    const headerHeight = 56;

    if (landscape) {
      // Board takes 50% width
      const availW = ww * 0.5 - padding * 2;
      const availH = wh - headerHeight - padding * 2;
      const fromW = availW / 4.2;
      const fromH = availH / (5.6 * 0.866);
      setHexSize(Math.max(34, Math.floor(Math.min(fromW, fromH))));
    } else {
      // Portrait Board at bottom
      const availW = ww - padding * 2;
      const availH = wh * 0.4 - padding;
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
    if (matchWinner) {
      playWin();
      // Celebrate with confetti
      const end = Date.now() + 3000;
      const colors = matchWinner === 'team1' ? ['#ff416c', '#ff4b2b'] : ['#00b09b', '#96c93d'];
      (function frame() {
        import('canvas-confetti').then(confetti => {
          confetti.default({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors });
          confetti.default({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors });
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      }());
    }
  }, [matchWinner, playWin]);

  useEffect(() => {
    if (answerRevealed && awardedTeam === team && team !== 'none') playWin();
  }, [answerRevealed, awardedTeam, team, playWin]);

  // Response Timer (15s) once someone buzzes
  const prevBuzzId = useRef<string | null>(null);
  useEffect(() => {
    const firstBuzz = buzzQueue[0];
    if (firstBuzz && firstBuzz.playerId !== prevBuzzId.current) {
      prevBuzzId.current = firstBuzz.playerId;
      // Reset timer to 15 seconds for the response
      setTimeLeft(15);
    } else if (!firstBuzz) {
      prevBuzzId.current = null;
    }
  }, [buzzQueue]);

  const handleBuzz = async () => {
    if (!questionActive || buzzed || buzzedRef.current) return;
    buzzedRef.current = true;
    setBuzzed(true);
    
    // Play team-specific sound
    if (myTeam === 'team1') playRed();
    else if (myTeam === 'team2') playGreen();
    else playClick();

    if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
    setBuzzerScale(0.88);
    setTimeout(() => setBuzzerScale(1.1), 150);
    setTimeout(() => setBuzzerScale(1), 350);
    await broadcastBuzz(roomCode!, { playerId: clientId, playerName: myName, team, timestamp: Date.now() });
  };

  const firstBuzz = buzzQueue[0];
  const isSyncing = buzzed && !buzzQueue.some(b => b.playerId === clientId);

  const hexStretchFactor = isLandscape ? 1.35 : 1.05;
  const hexH = hexSize * 0.866;
  const hexW = hexSize * hexStretchFactor;
  const boardW = (4 * 0.75 + 1) * hexW;
  const boardH = 5.5 * hexH;
  const borderThick = Math.max(16, hexSize * 0.28);

  const BoardSection = (
    <div style={{ position: 'relative', flexShrink: 0, '--hex-width': `${hexW}px`, '--hex-height': `${hexH}px` } as React.CSSProperties}>
      <div className="game-board" style={{ 
        width: boardW, height: boardH, position: 'relative'
      }}>
        {/* Background borders - Proportioned to match Board.tsx */}
        <div style={{ position: 'absolute', top: -borderThick, left: -borderThick, right: -borderThick, bottom: -borderThick, zIndex: 0, borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: hexW * 0.44, background: 'linear-gradient(to bottom, #ff416c, #ff4b2b)', boxShadow: '4px 0 10px rgba(255,65,108,0.2)' }} />
          <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: hexW * 0.44, background: 'linear-gradient(to bottom, #ff416c, #ff4b2b)', boxShadow: '-4px 0 10px rgba(255,65,108,0.2)' }} />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: hexH * 0.75, background: 'linear-gradient(to right, #00b09b, #96c93d)', boxShadow: '0 4px 10px rgba(0,176,155,0.2)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: hexH * 0.75, background: 'linear-gradient(to right, #00b09b, #96c93d)', boxShadow: '0 -4px 10px rgba(0,176,155,0.2)' }} />
        </div>
        
        {/* Soft Board Background */}
        <div style={{ position: 'absolute', inset: 0, background: '#f8f9fa', zIndex: 1, borderRadius: '20px' }} />

        <div className="hex-grid" style={{ position: 'relative', zIndex: 2, width: '100%', height: '100%' }}>
          {syncedBoard.map(hex => (
            <div key={hex.id} style={{ position: 'absolute', left: hex.colIndex * (hexW * 0.75), top: hex.row * hexH }}>
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
      <div style={{ flex: 1, display: 'flex', flexDirection: isLandscape ? 'row' : 'column', alignItems: 'center', gap: '20px', padding: '15px', overflow: 'hidden' }}>
        
        {/* Controls Section (Match Sample Image) */}
        <div style={{ 
          flex: 1, width: '100%', height: '100%', 
          display: 'flex', flexDirection: 'column', gap: '12px', 
          justifyContent: isLandscape ? 'flex-start' : 'center', minWidth: 0,
          maxWidth: isLandscape ? '450px' : 'none',
        }}>
          {/* Row 1: 3 Boxes */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <div className="glass-panel" style={{ flex: 1, padding: '8px', textAlign: 'center', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', fontWeight: '800' }}>الغرفة</div>
              <div style={{ fontSize: '1rem', fontWeight: '950', color: '#ff6b6b' }}>{roomCode}</div>
            </div>
            <div className="glass-panel" style={{ flex: 1, padding: '8px', textAlign: 'center', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', fontWeight: '800' }}>الاسم</div>
              <div style={{ fontSize: '0.9rem', fontWeight: '950', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{myName}</div>
            </div>
            <button onClick={toggleWakeLock} className="glass-panel" style={{ flex: 1, padding: '8px', textAlign: 'center', borderRadius: '12px', border: wakeLockActive ? '1px solid #ffb40066' : '1px solid var(--glass-border)' }}>
              <div style={{ fontSize: '0.55rem', color: wakeLockActive ? '#ffb400' : 'var(--text-secondary)', fontWeight: '800' }}>التنبيه</div>
              <div style={{ fontSize: '0.85rem', fontWeight: '950', color: wakeLockActive ? '#ffb400' : '#888' }}>{wakeLockActive ? 'ON' : 'OFF'}</div>
            </button>
          </div>

          {/* Row 2: Score Bar (Red/Green Split) */}
          <div style={{ display: 'flex', height: '48px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ flex: 1, background: 'linear-gradient(135deg, #ff416c, #ff4b2b)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '950', fontSize: '1.4rem' }}>
              {syncedTeam1Rounds}
              <span style={{ fontSize: '0.65rem', marginRight: '6px', opacity: 0.9 }}>أحمر</span>
            </div>
            <div style={{ flex: 1, background: 'linear-gradient(135deg, #00b09b, #96c93d)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '950', fontSize: '1.4rem' }}>
              {syncedTeam2Rounds}
              <span style={{ fontSize: '0.65rem', marginRight: '6px', opacity: 0.9 }}>أخضر</span>
            </div>
          </div>

          {/* Row 3: 3 Boxes (Turn, Letter, Timer) */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <div className="glass-panel" style={{ flex: 1, padding: '8px', textAlign: 'center', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', fontWeight: '800' }}>الدور</div>
              <div style={{ fontSize: '0.8rem', fontWeight: '950', color: syncedTurn === 'team1' ? '#ff416c' : '#00b09b' }}>{syncedTurn === 'team1' ? 'أحمر' : 'أخضر'}</div>
            </div>
            <div className="glass-panel" style={{ flex: 1, padding: '8px', textAlign: 'center', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', fontWeight: '800' }}>الحرف</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '950' }}>{currentQuestion?.letter ?? '-'}</div>
            </div>
            <div className="glass-panel" style={{ flex: 1, padding: '8px', textAlign: 'center', borderRadius: '12px', background: timeLeft <= 5 && questionActive ? 'rgba(255,65,108,0.05)' : 'white' }}>
              <div style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', fontWeight: '800' }}>الوقت</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '950', color: timeLeft <= 5 && questionActive ? '#ff416c' : '#2d3436' }}>
                {questionActive ? timeLeft : '-'}
              </div>
            </div>
          </div>
          
          {/* Large Buzzer Box (at bottom in Landscape) */}
          {isLandscape && (
            <div style={{ marginTop: 'auto', flex: 0.8 }}>
              {!questionActive ? (
                <div className="glass-panel" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontWeight: '800', border: '2px dashed var(--glass-border)' }}>
                  انتظار السؤال...
                </div>
              ) : SharedBuzzButton}
            </div>
          )}

          {!isLandscape && !questionActive && (
            <div style={{ marginTop: '10px' }}>
              {SharedBuzzButton}
            </div>
          )}
        </div>

        {/* Board Section */}
        <div style={{ flex: 1, width: isLandscape ? '50%' : '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {syncedBoard.length > 0 && BoardSection}
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

            <div style={{ maxHeight: '35vh', overflowY: 'auto', marginBottom: '25px', padding: '0 5px' }}>
              <p style={{ 
                fontSize: '1.4rem', fontWeight: '900', color: 'var(--text-primary)', lineHeight: 1.5, margin: 0,
                fontStyle: (hideQuestionFromPlayers && !firstBuzz) ? 'italic' : 'normal',
                opacity: (hideQuestionFromPlayers && !firstBuzz) ? 0.6 : 1
              }}>
                {hideQuestionFromPlayers && !firstBuzz 
                  ? 'المشرف يقرأ السؤال الآن... استعد للضغط!' 
                  : currentQuestion.question}
              </p>
            </div>

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

      {/* ── Match Winner Overlay ── */}
      {matchWinner && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(15px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          zIndex: 5000, animation: 'fadeIn 0.5s ease-out', padding: '20px'
        }}>
          <div className="glass-panel" style={{ 
            padding: '40px', borderRadius: '40px', textAlign: 'center', 
            boxShadow: '0 30px 60px rgba(0,0,0,0.12)', maxWidth: '500px', width: '100%',
            animation: 'popUp 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}>
            <div style={{ fontSize: '5rem', marginBottom: '20px' }}>🏆</div>
            <h1 style={{ 
              fontSize: '2.4rem', fontWeight: '950', textAlign: 'center', lineHeight: '1.2',
              color: matchWinner === 'team1' ? '#ff416c' : '#00b09b',
              marginBottom: '10px'
            }}>
              {matchWinner === 'team1' ? 'الفريق الأحمر فاز بالمباراة!' : 'الفريق الأخضر فاز بالمباراة!'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', fontWeight: '700', marginBottom: '30px' }}>
              تهانينا للفائز! حظاً أوفر في المرة القادمة للفريق الآخر.
            </p>
            <button 
              onClick={() => navigate('/')} 
              className="glass-panel"
              style={{ padding: '15px 40px', borderRadius: '20px', fontSize: '1.2rem', fontWeight: '900', color: 'var(--text-primary)', cursor: 'pointer' }}
            >
              العودة للرئيسية
            </button>
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
