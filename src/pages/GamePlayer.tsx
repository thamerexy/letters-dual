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
  const teamLabel = team === 'team1' ? 'الفريق الأحمر' : team === 'team2' ? 'الفريق الأخضر' : 'بدون فريق';

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
    if (gamePhase === 'lobby') {
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

  // Sync Buzzer Audio for all players
  useEffect(() => {
    if (buzzQueue.length === 1 && questionActive) {
      if (buzzQueue[0].team === 'team1') playRed();
      else if (buzzQueue[0].team === 'team2') playGreen();
    }
  }, [buzzQueue, questionActive, playRed, playGreen]);

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

  const BoardSection = (
    <div style={{ position: 'relative', flexShrink: 0, '--hex-width': `${hexW}px`, '--hex-height': `${hexH}px` } as React.CSSProperties}>
      <div className="game-board" style={{ 
        width: boardW, height: boardH, position: 'relative'
      }}>
        {/* Background borders - Identical to Board.tsx */}
        <div style={{ position: 'absolute', top: -15, left: -20, right: -20, bottom: -15, zIndex: 0, borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 35, background: 'linear-gradient(to bottom, #ff416c, #ff4b2b)', boxShadow: '4px 0 10px rgba(255,65,108,0.2)' }} />
          <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 35, background: 'linear-gradient(to bottom, #ff416c, #ff4b2b)', boxShadow: '-4px 0 10px rgba(255,65,108,0.2)' }} />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(to right, #00b09b, #96c93d)', boxShadow: '0 4px 10px rgba(0,176,155,0.2)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(to right, #00b09b, #96c93d)', boxShadow: '0 -4px 10px rgba(0,176,155,0.2)' }} />
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
      {/* ── Fixed Header (Identical to Admin) ── */}
      <div className="glass-panel" style={{
        padding: '0 16px', height: '56px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--glass-border)', zIndex: 100,
      }}>
        {/* Player Identity Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: `${teamColor}22`, border: `2px solid ${teamColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: '900', color: teamColor, boxShadow: 'var(--shadow-sm)' }}>
            {myName?.[0] ?? '?'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            <div style={{ fontSize: '0.95rem', fontWeight: '900', lineHeight: 1.1, color: 'var(--text-primary)' }}>{myName}</div>
            <div style={{ fontSize: '0.7rem', color: teamColor, fontWeight: '800' }}>{teamLabel}</div>
          </div>
        </div>

        {/* Status Area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', direction: 'ltr' }}>
          <button 
            onClick={toggleWakeLock} 
            style={{ 
              background: wakeLockActive ? 'rgba(255,180,0,0.15)' : 'rgba(255,255,255,0.06)', 
              border: `1px solid ${wakeLockActive ? 'rgba(255,180,0,0.3)' : 'var(--glass-border)'}`, 
              borderRadius: '10px', padding: '5px 12px', color: wakeLockActive ? '#ffb400' : '#777', 
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', 
              transition: 'all 0.3s', fontWeight: '800', fontSize: '0.75rem', boxShadow: 'var(--shadow-sm)' 
            }}
          >
            {wakeLockActive ? <Sun size={14} fill="currentColor" /> : <Moon size={14} />}
            <span style={{ display: isLandscape ? 'inline' : 'none' }}>Stay Awake</span>
          </button>
          
          <div style={{ background: 'white', border: '1px solid #ff6b6b33', borderRadius: '10px', padding: '2px 10px', textAlign: 'center', boxShadow: '0 2px 6px rgba(255,65,108,0.08)' }}>
            <div style={{ fontSize: '0.45rem', color: '#ff6b6b', letterSpacing: '0.5px', fontWeight: '800', lineHeight: 1 }}>ROOM</div>
            <div style={{ fontSize: '1.1rem', fontWeight: '950', letterSpacing: '2px', color: '#ff6b6b', lineHeight: 1 }}>{roomCode}</div>
          </div>
        </div>
      </div>

      {/* ── Waiting for Team Screen ── */}
      {team === 'none' && (
        <div style={{ 
          position: 'fixed', inset: 0, zIndex: 500, background: 'var(--bg-main)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '24px', textAlign: 'center'
        }}>
          <div className="glass-panel" style={{ padding: '40px', borderRadius: '32px', maxWidth: '400px', boxShadow: 'var(--shadow-lg)', animation: 'popUp 0.5s ease-out' }}>
            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>⏳</div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '950', color: 'var(--text-primary)', marginBottom: '12px' }}>في انتظار الانضمام...</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.6, fontWeight: '700' }}>
              أهلاً {myName}! <br/>
              يرجى الانتظار حتى يقوم مشرف اللعبة بتوزيعك على أحد الفريقين (الأحمر أو الأخضر).
            </p>
          </div>
        </div>
      )}

      {/* ── Main Layout ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: isLandscape ? 'row' : 'column', alignItems: 'center', gap: '20px', padding: '15px', overflow: 'hidden' }}>
        
        {/* Controls Section (Match Sample Image) */}
        <div style={{ 
          flex: 1, width: '100%', height: '100%', 
          display: 'flex', flexDirection: 'column', gap: '12px', 
          justifyContent: isLandscape ? 'flex-start' : 'center', minWidth: 0,
          maxWidth: isLandscape ? '450px' : 'none',
        }}>
          {/* Buzz Monitor (Identical to Admin) */}
          {buzzQueue.length > 0 && (
            <div style={{
              width: '100%', background: 'rgba(247,151,30,0.1)',
              border: '1px solid rgba(247,151,30,0.4)', borderRadius: '15px',
              padding: '14px 16px', fontFamily: "'Cairo', sans-serif",
              animation: 'fadeIn 0.3s ease-out'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#f7971e', fontWeight: '800', fontSize: '1rem' }}>
                <Zap size={18} /> ترتيب الضغط
              </div>
              {buzzQueue.map((buzz, i) => (
                <div key={buzz.playerId} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '8px 10px', marginBottom: '6px',
                  background: i === 0 ? 'rgba(247,151,30,0.2)' : 'rgba(255,255,255,0.04)',
                  borderRadius: '10px',
                  border: i === 0 ? '1px solid rgba(247,151,30,0.5)' : '1px solid transparent',
                }}>
                  <span style={{ fontWeight: '900', color: i === 0 ? '#ffd200' : '#666', fontSize: '1.1rem', width: '22px' }}>
                    {i === 0 ? '⚡' : `${i + 1}.`}
                  </span>
                  <span style={{ color: buzz.team === 'team1' ? '#ff6b6b' : '#00d4b4', fontWeight: '700', fontSize: '1rem', flex: 1 }}>
                    {buzz.playerName}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#555' }}>
                    {buzz.team === 'team1' ? 'الفريق الأحمر' : 'الفريق الأخضر'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Turn Indicator (Identical to Admin) */}
          <div className="glass-panel" style={{ width: '100%', borderRadius: '15px', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2px', fontWeight: '700' }}>دور من لاختيار الحرف؟</span>
            <span style={{ color: syncedTurn === 'team1' ? '#ff416c' : '#00b09b', fontSize: '1.4rem', fontWeight: '950' }}>
              {syncedTurn === 'team1' ? 'دور الفريق الأحمر' : 'دور الفريق الأخضر'}
            </span>
          </div>

          {/* Scoreboard (Identical to Admin) */}
          <div style={{ display: 'flex', width: '100%', height: '64px', borderRadius: '15px', overflow: 'hidden', boxShadow: 'var(--shadow-lg)', position: 'relative', border: '1px solid var(--glass-border)' }}>
            <div style={{ flex: 1, background: 'linear-gradient(135deg, #ff416c, #ff4b2b)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>الفريق الأحمر</span>
              <span style={{ fontSize: '1.6rem', fontWeight: '950' }}>{syncedTeam1Rounds}</span>
            </div>
            <div style={{ flex: 1, background: 'linear-gradient(135deg, #00b09b, #96c93d)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>الفريق الأخضر</span>
              <span style={{ fontSize: '1.6rem', fontWeight: '950' }}>{syncedTeam2Rounds}</span>
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
            background: 'white', borderRadius: '24px',
            padding: 'clamp(12px, 2.5vh, 24px) 24px', width: '100%', maxWidth: '480px', textAlign: 'center',
            boxShadow: 'var(--shadow-lg)', animation: 'popUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', color: 'var(--text-primary)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ width: '38px', height: '38px', background: 'var(--team2-light)', border: '1px solid var(--team2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--team2)', fontSize: '1.2rem', fontWeight: '900' }}>
                {currentQuestion.letter}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '800' }}>سؤال الحرف</div>
            </div>

            {/* Timer Bar (Identical to Admin) */}
            {!buzzed && !answerRevealed && (
              <div style={{ padding: '0 5px', marginBottom: 'clamp(5px, 1.5vh, 12px)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Cairo', sans-serif", fontSize: '0.9rem', fontWeight: '900', color: timeLeft <= 5 ? '#ff416c' : 'var(--text-secondary)', transition: 'color 0.3s' }}>
                  <span>{timeLeft}s</span>
                  <span>الزمن المتبقي</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#f1f3f5', borderRadius: '10px', overflow: 'hidden', marginTop: '5px', border: '1px solid rgba(0,0,0,0.03)' }}>
                  <div style={{
                    height: '100%',
                    width: `${(timeLeft / 20) * 100}%`,
                    background: timeLeft <= 5 ? 'linear-gradient(90deg, #ff416c, #ff4b2b)' : 'linear-gradient(90deg, #00b09b, #96c93d)',
                    transition: 'width 1s linear, background 0.3s ease'
                  }} />
                </div>
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
