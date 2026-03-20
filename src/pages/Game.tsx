import React, { useEffect, useState, useRef } from 'react';
import { Board } from '../components/Board';
import { useNavigate } from 'react-router-dom';
import { RotateCcw, Home, Undo2, Zap } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import type { Team } from '../store/gameStore';
import { createPortal } from 'react-dom';
import { QuestionModal } from '../components/QuestionModal';
import { useAudio } from '../hooks/useAudio';
import { useRoomStore } from '../store/roomStore';
import { broadcastGameState, broadcastBuzz as _broadcastBuzz } from '../services/realtime';

// suppress unused import lint (broadcastBuzz kept for reference)
void _broadcastBuzz;

export const Game: React.FC = () => {
  const navigate = useNavigate();
  const {
    resetGame, undoLastMove, previousBoard,
    team1RoundsWon, team2RoundsWon, requiredRoundsToWin,
    activeHexId, activeQuestion, claimHex, nextTurn,
    setActiveQuestion, board, currentTurn, winner, matchWinner
  } = useGameStore();
  const { buzzQueue, clearBuzzes } = useRoomStore();
  const [showWarningDialog, setShowWarningDialog] = useState<'reset' | 'home' | null>(null);
  const { playCorrect, playWrong } = useAudio();
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

  // Sync board state to all players whenever it changes
  useEffect(() => {
    broadcastGameState({ board, currentTurn, team1RoundsWon, team2RoundsWon, winner, matchWinner });
  }, [board, currentTurn, team1RoundsWon, team2RoundsWon, winner, matchWinner]);

  // Broadcast when question becomes active (without answer)
  const prevActiveRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeHexId && activeQuestion && activeHexId !== prevActiveRef.current) {
      prevActiveRef.current = activeHexId;
      const letter = board.find(h => h.id === activeHexId)?.letter || '';
      broadcastGameState({ questionActive: true, currentQuestion: { question: activeQuestion.question, letter }, answerRevealed: false, awardedTeam: null, revealedAnswer: null });
    } else if (!activeHexId && prevActiveRef.current) {
      prevActiveRef.current = null;
      broadcastGameState({ questionActive: false, currentQuestion: null });
    }
  }, [activeHexId, activeQuestion, board]);

  const executeAction = () => {
    if (showWarningDialog === 'reset') {
      resetGame();
      broadcastGameState({ questionActive: false, currentQuestion: null });
    } else if (showWarningDialog === 'home') {
      resetGame();
      navigate('/');
    }
    setShowWarningDialog(null);
  };

  const handleAnswerComplete = async (claimedBy: Team | null) => {
    const answer = activeQuestion?.answer || '';
    // Reveal answer to all players
    await broadcastGameState({ answerRevealed: true, awardedTeam: claimedBy ?? 'none', revealedAnswer: answer });

    if (activeHexId && claimedBy && claimedBy !== 'none') {
      claimHex(activeHexId, claimedBy);
      playCorrect();
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
      background: 'radial-gradient(circle at 10% 20%, rgb(30,30,30) 0%, rgb(15,15,15) 100%)',
      overflow: 'hidden',
    }}>
      <div style={{
        transform: `scale(${scale})`,
        display: 'flex', flexDirection: isLandscape ? 'row' : 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '40px', width: '100%', height: '100%',
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
          <div style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '15px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: "'Cairo', sans-serif" }}>
            <span style={{ color: '#ccc', fontSize: '1.4rem', marginBottom: '5px' }}>دور من لاختيار الحرف؟</span>
            <span style={{ color: currentTurn === 'team1' ? '#ff416c' : '#00b09b', fontSize: '1.8rem', fontWeight: 'bold' }}>
              {currentTurn === 'team1' ? 'دور الفريق الأحمر' : 'دور الفريق الأخضر'}
            </span>
          </div>

          {/* Scoreboard */}
          <div style={{ display: 'flex', fontFamily: "'Cairo', sans-serif", width: '100%', height: '80px', borderRadius: '15px', overflow: 'hidden', boxShadow: '0 10px 20px rgba(0,0,0,0.3)', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 10 }}>
              <span style={{ background: '#333', padding: '2px 10px', borderRadius: '0 0 10px 10px', fontSize: '0.8rem', border: '1px solid #555', borderTop: 'none', color: 'white' }}>المطلوب {requiredRoundsToWin}</span>
            </div>
            <div style={{ flex: 1, background: '#ff3333', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>الفريق الأحمر</span>
              <span style={{ fontSize: '1.8rem', fontWeight: '900' }}>{team1RoundsWon}</span>
            </div>
            <div style={{ flex: 1, background: '#00cc66', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>الفريق الأخضر</span>
              <span style={{ fontSize: '1.8rem', fontWeight: '900' }}>{team2RoundsWon}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', direction: 'rtl', width: '100%' }}>
            {[
              { icon: <RotateCcw size={16} />, label: 'إعادة', onClick: () => setShowWarningDialog('reset') },
              { icon: <Undo2 size={16} />, label: 'تراجع', onClick: undoLastMove, disabled: !previousBoard },
              { icon: <Home size={16} />, label: 'الرئيسية', onClick: () => setShowWarningDialog('home') },
            ].map(({ icon, label, onClick, disabled }) => (
              <button key={label} onClick={onClick} disabled={!!disabled} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '12px 10px', background: disabled ? '#555' : '#888', border: 'none',
                borderRadius: '25px', color: disabled ? '#777' : '#222', fontSize: '1rem',
                fontWeight: 'bold', cursor: disabled ? 'not-allowed' : 'pointer',
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
    </div>
  );
};
