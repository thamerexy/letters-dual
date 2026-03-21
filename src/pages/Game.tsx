import React, { useEffect, useState, useRef } from 'react';
import { Board } from '../components/Board';
import { useNavigate } from 'react-router-dom';
import { 
  RotateCcw, Home, Undo2, Zap, Users, Sun, Moon, Bell 
} from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import type { Team } from '../store/gameStore';
import { createPortal } from 'react-dom';
import { QuestionModal } from '../components/QuestionModal';
import { useAudio } from '../hooks/useAudio';
import { useRoomStore } from '../store/roomStore';
import { broadcastGameState, broadcastBuzz as _broadcastBuzz } from '../services/realtime';
import { useWakeLock } from '../hooks/useWakeLock';
import confetti from 'canvas-confetti';

// suppress unused import lint (broadcastBuzz kept for reference)
void _broadcastBuzz;

export const Game: React.FC = () => {
  const navigate = useNavigate();
  const {
    resetGame, undoLastMove, previousBoard,
    team1RoundsWon, team2RoundsWon, requiredRoundsToWin,
    activeHexId, activeQuestion, claimHex, nextTurn,
    setActiveQuestion, board, currentTurn, winner, matchWinner,
    hideQuestionFromPlayers
  } = useGameStore();
  const { buzzQueue, clearBuzzes, roomCode, players } = useRoomStore();
  const [showPlayerPanel, setShowPlayerPanel] = useState(false);
  const [showWarningDialog, setShowWarningDialog] = useState<'reset' | 'home' | null>(null);
  const [joinNotification, setJoinNotification] = useState<string | null>(null);
  const { playCorrect, playWrong, playRed, playGreen } = useAudio();
  const { isActive: wakeLockActive, toggleWakeLock } = useWakeLock();
  
  const prevPlayersCount = useRef(players.length);

  // Monitor for new players to show notification
  useEffect(() => {
    if (players.length > prevPlayersCount.current) {
      const newPlayer = players[players.length - 1];
      if (newPlayer) {
        setJoinNotification(`اللاعب ${newPlayer.name} انضم للغرفة!`);
        setTimeout(() => setJoinNotification(null), 4000);
      }
    }
    prevPlayersCount.current = players.length;
  }, [players]);

  // Custom Arabic Audio for buzzers
  useEffect(() => {
    if (buzzQueue.length === 1 && !!activeHexId) {
      if (buzzQueue[0].team === 'team1') playRed();
      else if (buzzQueue[0].team === 'team2') playGreen();
    }
  }, [buzzQueue, activeHexId, playRed, playGreen]);
  const [scale, setScale] = useState(1);
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const ww = window.innerWidth, wh = window.innerHeight;
      const landscape = ww > wh;
      setIsLandscape(landscape);
      let s = Math.min(ww / (landscape ? 800 : 420), wh / (landscape ? 500 : 750));
      s = Math.max(0.5, Math.min(3.0, s));
      setScale(s);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync board state to all players whenever it changes OR a new player joins
  useEffect(() => {
    broadcastGameState({ 
      gamePhase: 'game',
      board, currentTurn, team1RoundsWon, team2RoundsWon, winner, matchWinner,
      buzzQueue, hideQuestionFromPlayers
    });
  }, [board, currentTurn, team1RoundsWon, team2RoundsWon, winner, matchWinner, players.length, buzzQueue]);

  // Broadcast when question becomes active (without answer)
  const prevActiveRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeHexId && activeQuestion && activeHexId !== prevActiveRef.current) {
      prevActiveRef.current = activeHexId;
      const letter = board.find(h => h.id === activeHexId)?.letter || '';
      broadcastGameState({ 
        gamePhase: 'game',
        questionActive: true, 
        currentQuestion: { question: activeQuestion.question, letter }, 
        answerRevealed: false, awardedTeam: null, revealedAnswer: null,
        buzzQueue, // Sync official queue
        hideQuestionFromPlayers
      });
    } else if (!activeHexId && prevActiveRef.current) {
      prevActiveRef.current = null;
      broadcastGameState({ gamePhase: 'game', questionActive: false, currentQuestion: null, buzzQueue: [], hideQuestionFromPlayers });
    }
  }, [activeHexId, activeQuestion, board, buzzQueue, hideQuestionFromPlayers]);

  const executeAction = async () => {
    if (showWarningDialog === 'reset') {
      await broadcastGameState({ gamePhase: 'lobby', board: [], currentTurn: 'team1', team1RoundsWon: 0, team2RoundsWon: 0, winner: null, matchWinner: null });
      resetGame();
    } else if (showWarningDialog === 'home') {
      await broadcastGameState({ gamePhase: 'lobby' });
      resetGame();
      navigate('/');
    }
    setShowWarningDialog(null);
  };

  const handleAnswerComplete = async (claimedBy: Team | null) => {
    const answer = activeQuestion?.answer || '';
    // Reveal answer to all players
    await broadcastGameState({ answerRevealed: true, awardedTeam: claimedBy ?? 'none', revealedAnswer: answer, buzzQueue });

    if (activeHexId && claimedBy && claimedBy !== 'none') {
      claimHex(activeHexId, claimedBy);
      playCorrect();
      
      // Celebrate with confetti
      const color = claimedBy === 'team1' ? '#ff416c' : '#00b09b';
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: [color, '#ffffff']
      });
    } else {
      nextTurn();
      playWrong();
    }
    clearBuzzes();
    setActiveQuestion(null, null);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-main)',
      overflow: 'hidden',
    }}>
      {/* ── Fixed Header (Single-line for Portrait) ── */}
      <div className="glass-panel" style={{
        position: 'absolute', top: 0, left: 0, right: 0, 
        minHeight: '56px', height: isLandscape ? '56px' : 'auto',
        padding: isLandscape ? '0 16px' : '0 10px', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'nowrap', gap: '8px',
        borderBottom: '1px solid var(--glass-border)',
        direction: 'rtl', fontFamily: "'Cairo', sans-serif"
      }}>
        {/* Left: Players Button (More compact) */}
        <button onClick={() => setShowPlayerPanel(true)} style={{ 
          background: 'white', border: '1px solid var(--glass-border)', 
          borderRadius: '10px', padding: '6px 10px', color: 'var(--text-primary)', cursor: 'pointer', 
          display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '850',
          boxShadow: 'var(--shadow-sm)', flexShrink: 0
        }}>
          <Users size={16} />
          <span>اللاعبون ({players.length})</span>
        </button>

        {/* Right: Badges (More compact) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', direction: 'ltr', flexShrink: 0 }}>
          <button 
            onClick={toggleWakeLock}
            style={{ 
              background: wakeLockActive ? 'rgba(255,180,0,0.15)' : 'rgba(255,255,255,0.06)', 
              border: `1px solid ${wakeLockActive ? 'rgba(255,180,0,0.3)' : 'var(--glass-border)'}`,
              borderRadius: '10px', padding: '5px 10px', color: wakeLockActive ? '#ffb400' : '#777',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.3s',
              fontWeight: '800', fontSize: '0.75rem', boxShadow: 'var(--shadow-sm)'
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

      {/* Join Notification Toast */}
      {joinNotification && (
        <div style={{ 
          position: 'absolute', top: '75px', left: '50%', transform: 'translateX(-50%)', 
          zIndex: 200, background: 'rgba(50,55,70,0.95)', border: '1px solid #77aaff33',
          padding: '12px 24px', borderRadius: '40px', color: 'white', fontWeight: '900',
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', gap: '12px',
          animation: 'slideInDown 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)', cursor: 'pointer'
        }} onClick={() => setShowPlayerPanel(true)}>
          <Bell size={18} color="#77aaff" />
          <span style={{ fontSize: '1rem', fontWeight: '700' }}>{joinNotification}</span>
        </div>
      )}

      <div style={{
        transform: `scale(${scale})`,
        display: 'flex', flexDirection: isLandscape ? 'row' : 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '40px', width: '100%', height: 'calc(100% - 70px)', 
        marginTop: isLandscape ? '64px' : '90px',
      }}>
        {/* Side Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', width: isLandscape ? '380px' : '100%', flexShrink: 0 }}>

          {/* Buzz Monitor */}
          {buzzQueue.length > 0 && (
            <div style={{
              width: '100%', background: 'rgba(247,151,30,0.1)',
              border: '1px solid rgba(247,151,30,0.4)', borderRadius: '15px',
              padding: '14px 16px', fontFamily: "'Cairo', sans-serif",
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
                  <span style={{ fontSize: '0.75rem', color: '#555' }}>{buzz.team === 'team1' ? 'أحمر' : 'أخضر'}</span>
                </div>
              ))}
            </div>
          )}

          {/* Turn */}
          <div className="glass-panel" style={{ width: '100%', borderRadius: '15px', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: "'Cairo', sans-serif" }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2px' }}>دور من لاختيار الحرف؟</span>
            <span style={{ color: currentTurn === 'team1' ? '#ff416c' : '#00b09b', fontSize: '1.4rem', fontWeight: 'bold' }}>
              {currentTurn === 'team1' ? 'دور الفريق الأحمر' : 'دور الفريق الأخضر'}
            </span>
          </div>

          {/* Scoreboard (Smaller) */}
          <div style={{ display: 'flex', fontFamily: "'Cairo', sans-serif", width: '100%', height: '64px', borderRadius: '15px', overflow: 'hidden', boxShadow: 'var(--shadow-lg)', position: 'relative', border: '1px solid var(--glass-border)' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 10 }}>
              <span style={{ background: '#f8f9fa', padding: '1px 8px', borderRadius: '0 0 8px 8px', fontSize: '0.7rem', border: '1px solid var(--glass-border)', borderTop: 'none', color: '#666' }}>المطلوب {requiredRoundsToWin}</span>
            </div>
            <div style={{ flex: 1, background: 'linear-gradient(135deg, #ff416c, #ff4b2b)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>أحمر</span>
              <span style={{ fontSize: '1.5rem', fontWeight: '900' }}>{team1RoundsWon}</span>
            </div>
            <div style={{ flex: 1, background: 'linear-gradient(135deg, #00b09b, #96c93d)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>أخضر</span>
              <span style={{ fontSize: '1.5rem', fontWeight: '900' }}>{team2RoundsWon}</span>
            </div>
          </div>

          {/* Action Buttons (More Compact) */}
          <div style={{ display: 'flex', gap: '8px', direction: 'rtl', width: '100%' }}>
            {[
              { icon: <RotateCcw size={14} />, label: 'إعادة', onClick: () => setShowWarningDialog('reset') },
              { icon: <Undo2 size={14} />, label: 'تراجع', onClick: undoLastMove, disabled: !previousBoard },
              { icon: <Home size={14} />, label: 'الرئيسية', onClick: () => setShowWarningDialog('home') },
            ].map(({ icon, label, onClick, disabled }) => (
              <button key={label} onClick={onClick} disabled={!!disabled} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '10px 8px', background: disabled ? '#f1f3f5' : 'white', border: '1px solid var(--glass-border)',
                borderRadius: '15px', color: disabled ? '#ccc' : 'var(--text-primary)', fontSize: '0.9rem',
                fontWeight: 'bold', cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                boxShadow: disabled ? 'none' : 'var(--shadow-sm)'
              }}>
                {icon}{label}
              </button>
            ))}
          </div>
        </div>

        <div className="board-container" style={{ margin: 0 }}>
          <Board />
        </div>
      </div>

      {/* Warning Dialog */}
      {showWarningDialog && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, direction: 'rtl', fontFamily: "'Cairo', sans-serif" }}>
          <div style={{ background: 'linear-gradient(135deg, #2a2a2a, #1a1a1a)', padding: '30px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center', maxWidth: '400px', width: '90%' }}>
            <h3 style={{ color: 'white', fontSize: '1.8rem', margin: '0 0 15px' }}>هل أنت متأكد؟</h3>
            <p style={{ color: '#ccc', fontSize: '1.2rem', marginBottom: '25px' }}>
              {showWarningDialog === 'home' ? 'العودة للرئيسية ستمسح التقدم الحالي.' : 'إعادة اللعبة ستصفّر اللوحة بالكامل.'}
            </p>
            <div style={{ display: 'flex', gap: '15px' }}>
              <button onClick={executeAction} style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #ff416c, #ff4b2b)', border: 'none', borderRadius: '10px', color: 'white', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}>نعم</button>
              <button onClick={() => setShowWarningDialog(null)} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', color: 'white', fontSize: '1.1rem', cursor: 'pointer' }}>إلغاء</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Question Modal — admin always sees answer */}
      {activeHexId && activeQuestion && (
        <QuestionModal
          isOpen={true}
          letter={board.find(h => h.id === activeHexId)?.letter || ''}
          question={activeQuestion.question}
          answer={activeQuestion.answer}
          onAnswerComplete={handleAnswerComplete}
          onClose={() => {
            clearBuzzes();
            broadcastGameState({ questionActive: false, currentQuestion: null });
            setActiveQuestion(null, null);
          }}
          showAnswer={true}
          buzzQueue={buzzQueue}
          inline={false}
        />
      )}

      <style>{`@keyframes fadeIn { from { opacity:0; } to { opacity:1; } }`}</style>

      {/* Mid-game Player Management Panel */}
      {showPlayerPanel && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, direction: 'rtl', fontFamily: "'Cairo', sans-serif" }}>
          <div style={{ background: 'linear-gradient(135deg, #1e2030, #14161f)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '24px', width: '90%', maxWidth: '460px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.4rem', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={20} /> إدارة اللاعبين
              </h3>
              <div style={{ background: 'rgba(255,107,107,0.15)', border: '1px solid rgba(255,107,107,0.35)', borderRadius: '8px', padding: '2px 10px', color: '#ff6b6b', fontSize: '1rem', fontWeight: '900', letterSpacing: '4px' }}>{roomCode}</div>
            </div>
            <p style={{ color: '#666', fontSize: '0.85rem', margin: '0 0 14px' }}>اللاعبون المتصلون الآن — يمكن للاعب إعادة الانضمام بنفس الرمز</p>
            {players.length === 0 ? (
              <div style={{ color: '#555', textAlign: 'center', padding: '20px', fontSize: '0.95rem' }}>لا يوجد لاعبون متصلون حالياً</div>
            ) : (
              players.map((player) => {
                const tc = player.team === 'team1' ? '#ff416c' : player.team === 'team2' ? '#00b09b' : '#555';
                const tl = player.team === 'team1' ? 'أحمر' : player.team === 'team2' ? 'أخضر' : 'بدون فريق';
                return (
                  <div key={player.clientId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.04)', border: `1px solid ${player.team !== 'none' ? tc + '35' : 'rgba(255,255,255,0.06)'}`, borderRadius: '12px', padding: '10px 12px', marginBottom: '8px', transition: 'border-color 0.3s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: `${tc}22`, border: `2px solid ${tc}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: '800', color: tc, flexShrink: 0 }}>{player.name[0]}</div>
                      <div>
                        <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'white' }}>{player.name}</div>
                        <div style={{ fontSize: '0.72rem', color: tc }}>{tl}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button onClick={() => { import('../services/realtime').then(r => r.broadcastTeamAssign(player.clientId, 'team1')); }} style={{ padding: '6px 10px', background: player.team === 'team1' ? '#ff416c' : 'rgba(255,65,108,0.12)', border: '1px solid rgba(255,65,108,0.4)', borderRadius: '8px', color: 'white', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer' }}>أحمر</button>
                      <button onClick={() => { import('../services/realtime').then(r => r.broadcastTeamAssign(player.clientId, 'team2')); }} style={{ padding: '6px 10px', background: player.team === 'team2' ? '#00b09b' : 'rgba(0,176,155,0.12)', border: '1px solid rgba(0,176,155,0.4)', borderRadius: '8px', color: 'white', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer' }}>أخضر</button>
                    </div>
                  </div>
                );
              })
            )}
            <button onClick={() => setShowPlayerPanel(false)} style={{ marginTop: '10px', width: '100%', padding: '11px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: '#aaa', fontSize: '1rem', cursor: 'pointer', fontFamily: "'Cairo', sans-serif" }}>إغلاق</button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
