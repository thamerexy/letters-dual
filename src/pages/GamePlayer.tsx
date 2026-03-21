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

  // Board geometry constants
  const hexH = hexSize * 0.866 * 1.05; // Added slight spacing multiplier
  const boardW = (4 * 0.75 + 1) * hexSize;
  const boardH = 5.5 * hexH;
  const borderThick = Math.max(14, hexSize * 0.22);

  // Responsive hex sizing
  const calcHexSize = useCallback(() => {
    const ww = window.innerWidth;
    const wh = window.innerHeight;
    const landscape = ww > wh;
    setIsLandscape(landscape);

    if (landscape) {
      const availW = ww * 0.58 - 20;
      const availH = wh - 65 - 20; // Room for header
      const fromW = availW / 4.2;
      const fromH = availH / (5.6 * 0.866);
      setHexSize(Math.max(30, Math.floor(Math.min(fromW, fromH))));
    } else {
      const availW = ww - 28;
      const availH = wh * 0.42;
      const fromW = availW / 4.2;
      const fromH = availH / (5.6 * 0.866);
      setHexSize(Math.max(28, Math.floor(Math.min(fromW, fromH))));
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
    if (gamePhase === 'finished' || gamePhase === 'lobby') navigate('/');
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
    setTimeout(() => setBuzzerScale(1.15), 150);
    setTimeout(() => setBuzzerScale(1), 350);
    await broadcastBuzz(roomCode!, { playerId: clientId, playerName: myName, team, timestamp: Date.now() });
  };

  const firstBuzz = buzzQueue[0];
  const myBuzzRank = buzzQueue.findIndex(b => b.playerId === clientId);

  // ───── Board Render ─────
  const BoardSection = (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{ 
        position: 'relative', width: boardW + borderThick * 2, height: boardH + borderThick * 2, 
        borderRadius: '16px', overflow: 'hidden', 
        boxShadow: '0 20px 50px rgba(0,0,0,0.8), inset 0 0 20px rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.08)' 
      }}>
        {/* Borders */}
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: borderThick, background: 'linear-gradient(to bottom, #ff3b6c, #ff1b00)', zIndex: 2, boxShadow: '5px 0 15px rgba(255,0,0,0.3)' }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: borderThick, background: 'linear-gradient(to bottom, #ff3b6c, #ff1b00)', zIndex: 2, boxShadow: '-5px 0 15px rgba(255,0,0,0.3)' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: borderThick, background: 'linear-gradient(to right, #00b09b, #3d9646)', zIndex: 2, boxShadow: '0 5px 15px rgba(0,255,100,0.2)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: borderThick, background: 'linear-gradient(to right, #00b09b, #3d9646)', zIndex: 2, boxShadow: '0 -5px 15px rgba(0,255,100,0.2)' }} />
        
        {/* Hex grid */}
        <div style={{ position: 'absolute', left: borderThick, top: borderThick, width: boardW, height: boardH, background: 'rgba(10,10,18,0.95)', zIndex: 1 }}>
          {syncedBoard.map(hex => {
            const isTeam1 = hex.owner === 'team1';
            const isTeam2 = hex.owner === 'team2';
            const bg = isTeam1 ? 'linear-gradient(135deg, #ff416c, #ff4b2b)' : isTeam2 ? 'linear-gradient(135deg, #00b09b, #96c93d)' : 'linear-gradient(135deg, #2c2e3e, #1a1c2a)';
            const shadow = isTeam1 ? '0 0 15px rgba(255,65,108,0.6)' : isTeam2 ? '0 0 15px rgba(0,176,155,0.6)' : 'none';
            const textColor = isTeam1 || isTeam2 ? 'white' : '#777';
            const borderColor = isTeam1 || isTeam2 ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.08)';

            return (
              <div key={hex.id} style={{
                position: 'absolute',
                left: hex.colIndex * (hexSize * 0.75),
                top: hex.row * hexH,
                width: hexSize, height: hexH,
                clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
                background: bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: `${Math.max(12, hexSize * 0.3)}px`, fontWeight: '900', color: textColor,
                boxShadow: shadow,
                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                border: `1px solid ${borderColor}`,
                zIndex: isTeam1 || isTeam2 ? 10 : 1,
                transform: isTeam1 || isTeam2 ? 'scale(1.02)' : 'scale(1)',
              }}>{hex.letter}</div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const InfoPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: 0, justifyContent: 'space-between', padding: isLandscape ? '0 10px 0 0' : '0' }}>
      <div style={{ display: 'flex', gap: '6px' }}>
        {[
          { rounds: syncedTeam1Rounds, color: '#ff416c', bg: 'rgba(255,65,108,0.18)', border: 'rgba(255,65,108,0.3)', label: 'أحمر' },
          { rounds: syncedTeam2Rounds, color: '#00b09b', bg: 'rgba(0,176,155,0.18)', border: 'rgba(0,176,155,0.3)', label: 'أخضر' },
        ].map(({ rounds, color, bg, border, label }) => (
          <div key={label} style={{ flex: 1, textAlign: 'center', background: bg, border: `1px solid ${border}`, borderRadius: '12px', padding: '6px 0', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: '900', color, lineHeight: 1 }}>{rounds}</div>
            <div style={{ fontSize: '0.7rem', color, opacity: 0.9, fontWeight: '700' }}>{label}</div>
          </div>
        ))}
      </div>

      {!questionActive && (
        <div style={{ textAlign: 'center', fontSize: '0.9rem', color: '#999', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '8px 12px', animation: 'fadeIn 0.6s ease-out' }}>
          دور الاختيار:{' '}
          <span style={{ color: syncedTurn === 'team1' ? '#ff416c' : '#00b09b', fontWeight: '900' }}>
            {syncedTurn === 'team1' ? 'الأحمر' : 'الأخضر'}
          </span>
        </div>
      )}

      {questionActive && currentQuestion && (
        <div style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '18px', textAlign: 'center', animation: 'fadeInDown 0.4s cubic-bezier(0.19, 1, 0.22, 1)', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
          <div style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '8px', letterSpacing: '1px' }}>
            حرف <span style={{ color: '#ffd200', fontWeight: '900', fontSize: '1.2rem', textShadow: '0 0 10px rgba(255,210,0,0.4)' }}>{currentQuestion.letter}</span>
          </div>
          <p style={{ fontSize: isLandscape ? '1.2rem' : '1.15rem', fontWeight: '800', color: '#fff', margin: 0, lineHeight: 1.6, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
            {currentQuestion.question}
          </p>
          {answerRevealed && (
            <div style={{ marginTop: '14px', background: 'rgba(247,151,30,0.18)', border: '1px solid rgba(247,151,30,0.4)', borderRadius: '12px', padding: '12px', animation: 'fadeIn 0.6s ease-out', boxShadow: '0 0 20px rgba(247,151,30,0.1)' }}>
              <div style={{ fontSize: '0.75rem', color: '#f7971e', marginBottom: '4px', fontWeight: '700' }}>الجواب</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#ffd200' }}>{revealedAnswer}</div>
              {awardedTeam && awardedTeam !== 'none' && (
                <div style={{ marginTop: '8px', fontSize: '1rem', color: awardedTeam === 'team1' ? '#ff6b6b' : '#00d4b4', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Zap size={16} /> {awardedTeam === 'team1' ? 'نقطة للفريق الأحمر!' : 'نقطة للفريق الأخضر!'}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {firstBuzz && questionActive && (
        <div style={{ textAlign: 'center', animation: 'fadeIn 0.4s ease-out' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: firstBuzz.team === 'team1' ? 'rgba(255,65,108,0.2)' : 'rgba(0,176,155,0.2)',
            border: `1px solid ${firstBuzz.team === 'team1' ? 'rgba(255,65,108,0.5)' : 'rgba(0,176,155,0.5)'}`,
            borderRadius: '14px', padding: '10px 22px',
            color: firstBuzz.team === 'team1' ? '#ff8585' : '#00ffda',
            fontSize: '1rem', fontWeight: '900',
            boxShadow: `0 0 20px ${firstBuzz.team === 'team1' ? 'rgba(255,65,108,0.2)' : 'rgba(0,176,155,0.2)'}`
          }}>
            <Zap size={18} fill="currentColor" />
            {firstBuzz.playerId === clientId ? 'أنت ضغطت أولاً!' : `${firstBuzz.playerName} ضغط أولاً!`}
          </div>
          {myBuzzRank > 0 && (
            <div style={{ marginTop: '6px', fontSize: '0.8rem', color: '#555', fontWeight: '700' }}>أنت في المرتبة #{myBuzzRank + 1}</div>
          )}
        </div>
      )}

      <button
        onClick={handleBuzz}
        disabled={!questionActive || buzzed}
        style={{
          width: '100%',
          height: isLandscape ? '76px' : '86px',
          borderRadius: '20px',
          background: !questionActive ? 'rgba(40,40,55,0.6)' : buzzed
            ? 'linear-gradient(135deg, #333, #222)'
            : `linear-gradient(135deg, ${teamColor}, ${team === 'team1' ? '#ff4b2b' : '#96c93d'})`,
          border: !questionActive ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.15)',
          color: !questionActive ? '#444' : buzzed ? '#666' : 'white',
          fontSize: !questionActive ? '1.1rem' : '1.8rem',
          fontWeight: '950', letterSpacing: '2px',
          cursor: !questionActive || buzzed ? 'not-allowed' : 'pointer',
          boxShadow: questionActive && !buzzed ? `0 15px 45px ${teamColor}66` : 'none',
          transform: `scale(${buzzerScale})`,
          transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          flexShrink: 0,
        }}
      >
        {!questionActive ? 'انتظر السؤال...' : buzzed ? '✓ تم الضغط!' : '⚡  BUZZ!'}
      </button>
    </div>
  );

  return (
    <div ref={containerRef} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: `radial-gradient(circle at 50% 0%, ${teamColor}18 0%, rgb(8,8,14) 75%)`,
      color: 'white', fontFamily: "'Cairo', sans-serif", direction: 'rtl',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* ── Header ── */}
      <div style={{
        padding: '10px 16px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)',
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: `${teamColor}28`, border: `2px solid ${teamColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: '900', color: teamColor, flexShrink: 0 }}>
              {myName?.[0] ?? '?'}
            </div>
            <div style={{ position: 'absolute', bottom: -2, right: -2, width: '12px', height: '12px', borderRadius: '50%', background: '#00ff00', border: '2px solid #000' }} title="متصل" />
          </div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: '900', lineHeight: 1.1 }}>{myName}</div>
            <div style={{ fontSize: '0.75rem', color: teamColor, fontWeight: '700' }}>{teamLabel}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Wake Lock Toggle */}
          <button 
            onClick={toggleWakeLock}
            style={{ 
              background: wakeLockActive ? 'rgba(255,210,0,0.15)' : 'rgba(255,255,255,0.05)', 
              border: `1px solid ${wakeLockActive ? 'rgba(255,210,0,0.3)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '8px', padding: '6px 8px', color: wakeLockActive ? '#ffd200' : '#666',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', transition: 'all 0.3s'
            }}
            title={wakeLockActive ? "الشاشة ستظل تعمل" : "تشغيل منع إغلاق الشاشة"}
          >
            {wakeLockActive ? <Sun size={14} fill="currentColor" /> : <Moon size={14} />}
            <span style={{ fontSize: '0.7rem', fontWeight: '700' }}>Stay Awake</span>
          </button>

          {/* Room code */}
          <div style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.25)', borderRadius: '10px', padding: '4px 14px', textAlign: 'center', minWidth: '80px', boxShadow: 'inset 0 0 10px rgba(255,65,108,0.05)' }}>
            <div style={{ fontSize: '0.55rem', color: '#ff6b6b', letterSpacing: '1px', fontWeight: '800' }}>ROOM</div>
            <div style={{ fontSize: '1.2rem', fontWeight: '950', letterSpacing: '4px', color: '#ff6b6b', lineHeight: 1.1 }}>{roomCode}</div>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      {isLandscape ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '20px', padding: '12px 20px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, animation: 'fadeInScale 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
            {syncedBoard.length > 0 ? BoardSection : (
              <div style={{ color: '#444', fontSize: '1rem', fontStyle: 'italic' }}>جاري تحميل اللوحة...</div>
            )}
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', minWidth: 0 }}>
            {InfoPanel}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'center', padding: '12px 16px 8px', animation: 'fadeInScale 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
            {syncedBoard.length > 0 ? BoardSection : (
              <div style={{ color: '#444', fontSize: '1rem', padding: '40px' }}>جاري تحميل اللوحة...</div>
            )}
          </div>
          <div style={{ flex: 1, padding: '4px 16px 20px', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
            {InfoPanel}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInDown { from { opacity:0; transform:translateY(-20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn     { from { opacity:0; } to { opacity:1; } }
        @keyframes fadeInScale { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); borderRadius: 10px; }
      `}</style>
    </div>
  );
};
