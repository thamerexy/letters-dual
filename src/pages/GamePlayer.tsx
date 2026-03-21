import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  const [isLandscape, setIsLandscape] = useState(false);
  const [hexSize, setHexSize] = useState(60);
  const buzzedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const team = myTeam;
  const teamColor = team === 'team1' ? '#ff416c' : '#00b09b';
  const teamLabel = team === 'team1' ? 'الفريق الأحمر' : 'الفريق الأخضر';

  // Board geometry constants
  const hexH = hexSize * 0.866;
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
      // Board occupies ~58% of width, full height minus header (~52px)
      const availW = ww * 0.58 - 20;
      const availH = wh - 52 - 20;
      // boardW = 4 * hexSize  →  hexSize = availW / 4
      // boardH = 5.5 * hexH = 5.5 * hexSize * 0.866  →  hexSize = availH / (5.5 * 0.866)
      const fromW = availW / 4;
      const fromH = availH / (5.5 * 0.866);
      setHexSize(Math.max(30, Math.floor(Math.min(fromW, fromH))));
    } else {
      // Board occupies full width minus padding, ~40% of height
      const availW = ww - 28;
      const availH = wh * 0.40;
      const fromW = availW / 4;
      const fromH = availH / (5.5 * 0.866);
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
    setTimeout(() => setBuzzerScale(1.1), 150);
    setTimeout(() => setBuzzerScale(1), 320);
    await broadcastBuzz(roomCode!, { playerId: clientId, playerName: myName, team, timestamp: Date.now() });
  };

  const firstBuzz = buzzQueue[0];
  const myBuzzRank = buzzQueue.findIndex(b => b.playerId === clientId);

  // ───── Board Render ─────
  const BoardSection = (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      {/* Outer glow wrapper with colored borders */}
      <div style={{ position: 'relative', width: boardW + borderThick * 2, height: boardH + borderThick * 2, borderRadius: '12px', overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }}>
        {/* Red left */}
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: borderThick, background: 'linear-gradient(to bottom, #ff416c, #ff4b2b)', zIndex: 2 }} />
        {/* Red right */}
        <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: borderThick, background: 'linear-gradient(to bottom, #ff416c, #ff4b2b)', zIndex: 2 }} />
        {/* Green top */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: borderThick, background: 'linear-gradient(to right, #00b09b, #96c93d)', zIndex: 2 }} />
        {/* Green bottom */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: borderThick, background: 'linear-gradient(to right, #00b09b, #96c93d)', zIndex: 2 }} />
        {/* Hex grid */}
        <div style={{ position: 'absolute', left: borderThick, top: borderThick, width: boardW, height: boardH, background: 'rgba(18,18,25,0.95)', zIndex: 1 }}>
          {syncedBoard.map(hex => {
            const bg = hex.owner === 'team1' ? 'rgba(255,65,108,0.82)' : hex.owner === 'team2' ? 'rgba(0,176,155,0.82)' : 'rgba(50,52,65,0.9)';
            const glow = hex.owner === 'team1' ? '0 0 8px rgba(255,65,108,0.5)' : hex.owner === 'team2' ? '0 0 8px rgba(0,176,155,0.5)' : 'none';
            return (
              <div key={hex.id} style={{
                position: 'absolute',
                left: hex.colIndex * (hexSize * 0.75),
                top: hex.row * hexH,
                width: hexSize, height: hexH,
                clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
                background: bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: `${Math.max(10, hexSize * 0.22)}px`, fontWeight: '900', color: 'white',
                boxShadow: glow,
                transition: 'background 0.4s, box-shadow 0.4s',
              }}>{hex.letter}</div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ───── Info + Question + Buzzer panel ─────
  const InfoPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: 0, justifyContent: 'space-between', padding: isLandscape ? '0 10px 0 0' : '0' }}>
      {/* Scores */}
      <div style={{ display: 'flex', gap: '6px' }}>
        {[
          { rounds: syncedTeam1Rounds, color: '#ff416c', bg: 'rgba(255,65,108,0.14)', border: 'rgba(255,65,108,0.3)', label: 'أحمر' },
          { rounds: syncedTeam2Rounds, color: '#00b09b', bg: 'rgba(0,176,155,0.14)', border: 'rgba(0,176,155,0.3)', label: 'أخضر' },
        ].map(({ rounds, color, bg, border, label }) => (
          <div key={label} style={{ flex: 1, textAlign: 'center', background: bg, border: `1px solid ${border}`, borderRadius: '10px', padding: '4px 0' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: '900', color, lineHeight: 1 }}>{rounds}</div>
            <div style={{ fontSize: '0.65rem', color, opacity: 0.8 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Turn */}
      {!questionActive && (
        <div style={{ textAlign: 'center', fontSize: '0.85rem', color: '#666', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '6px' }}>
          دور الاختيار:{' '}
          <span style={{ color: syncedTurn === 'team1' ? '#ff416c' : '#00b09b', fontWeight: '700' }}>
            {syncedTurn === 'team1' ? 'الأحمر' : 'الأخضر'}
          </span>
        </div>
      )}

      {/* Question card */}
      {questionActive && currentQuestion && (
        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px', textAlign: 'center', animation: 'fadeInDown 0.4s ease-out', flex: 1 }}>
          <div style={{ fontSize: '0.78rem', color: '#888', marginBottom: '5px' }}>
            حرف <span style={{ color: '#f7971e', fontWeight: '800', fontSize: '0.9rem' }}>{currentQuestion.letter}</span>
          </div>
          <p style={{ fontSize: isLandscape ? '1.1rem' : '1.05rem', fontWeight: '800', color: '#fff', margin: 0, lineHeight: 1.6 }}>
            {currentQuestion.question}
          </p>
          {answerRevealed && (
            <div style={{ marginTop: '10px', background: 'rgba(247,151,30,0.15)', border: '1px solid rgba(247,151,30,0.35)', borderRadius: '10px', padding: '10px', animation: 'fadeIn 0.5s ease-out' }}>
              <div style={{ fontSize: '0.7rem', color: '#f7971e', marginBottom: '3px' }}>الجواب</div>
              <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#ffd200' }}>{revealedAnswer}</div>
              {awardedTeam && awardedTeam !== 'none' && (
                <div style={{ marginTop: '5px', fontSize: '0.85rem', color: awardedTeam === 'team1' ? '#ff6b6b' : '#00d4b4', fontWeight: '700' }}>
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
            borderRadius: '12px', padding: '7px 16px',
            color: firstBuzz.team === 'team1' ? '#ff6b6b' : '#00d4b4',
            fontSize: '0.92rem', fontWeight: '800',
          }}>
            {firstBuzz.playerId === clientId ? '⚡ أنت ضغطت أولاً!' : `⚡ ${firstBuzz.playerName} ضغط أولاً!`}
          </div>
          {myBuzzRank > 0 && (
            <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#555' }}>أنت في المرتبة #{myBuzzRank + 1}</div>
          )}
        </div>
      )}

      {/* BUZZER */}
      <button
        onClick={handleBuzz}
        disabled={!questionActive || buzzed}
        style={{
          width: '100%',
          height: isLandscape ? '72px' : '80px',
          borderRadius: '18px',
          background: !questionActive ? 'rgba(35,35,45,0.8)' : buzzed
            ? 'linear-gradient(135deg, #444, #333)'
            : `linear-gradient(135deg, ${teamColor}, ${team === 'team1' ? '#ff4b2b' : '#96c93d'})`,
          border: !questionActive ? '1px solid rgba(255,255,255,0.06)' : 'none',
          color: !questionActive ? '#3a3a4a' : buzzed ? '#888' : 'white',
          fontSize: !questionActive ? '0.95rem' : '1.6rem',
          fontWeight: '900', letterSpacing: '2px',
          cursor: !questionActive || buzzed ? 'not-allowed' : 'pointer',
          boxShadow: questionActive && !buzzed ? `0 12px 32px ${teamColor}55` : 'none',
          transform: `scale(${buzzerScale})`,
          transition: 'transform 0.15s, background 0.3s, box-shadow 0.3s',
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
      background: `radial-gradient(circle at 50% 0%, ${teamColor}14 0%, rgb(8,8,14) 70%)`,
      color: 'white', fontFamily: "'Cairo', sans-serif", direction: 'rtl',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* ── Header ── */}
      <div style={{
        padding: '8px 14px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)',
      }}>
        {/* Player avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: `${teamColor}28`, border: `2px solid ${teamColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: '800', color: teamColor, flexShrink: 0 }}>
            {myName?.[0] ?? '?'}
          </div>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: '700', lineHeight: 1 }}>{myName}</div>
            <div style={{ fontSize: '0.65rem', color: teamColor }}>{teamLabel}</div>
          </div>
        </div>

        {/* Room code (always visible) */}
        <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '3px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.55rem', color: '#666', letterSpacing: '1px' }}>ROOM</div>
          <div style={{ fontSize: '1rem', fontWeight: '900', letterSpacing: '4px', color: '#ff6b6b' }}>{roomCode}</div>
        </div>
      </div>

      {/* ── Main Content ── */}
      {isLandscape ? (
        // Landscape: board left (big), info panel right
        <div style={{ flex: 1, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px', padding: '8px 14px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {syncedBoard.length > 0 ? BoardSection : (
              <div style={{ color: '#333', fontSize: '0.9rem', textAlign: 'center', padding: '20px' }}>جاري تحميل اللوحة...</div>
            )}
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', minWidth: 0 }}>
            {InfoPanel}
          </div>
        </div>
      ) : (
        // Portrait: board top, info panel below
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'center', padding: '8px 14px 4px' }}>
            {syncedBoard.length > 0 ? BoardSection : (
              <div style={{ color: '#333', fontSize: '0.9rem', padding: '20px' }}>جاري تحميل اللوحة...</div>
            )}
          </div>
          <div style={{ flex: 1, padding: '4px 14px 14px', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
            {InfoPanel}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInDown { from { opacity:0; transform:translateY(-16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn     { from { opacity:0; } to { opacity:1; } }
      `}</style>
    </div>
  );
};
