import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Hexagon } from './Hexagon';
import { useGameStore } from '../store/gameStore';
import type { HexState, Team } from '../store/gameStore';
import { getRandomQuestionForLetter } from '../services/questions';
import { useAudio } from '../hooks/useAudio';
import confetti from 'canvas-confetti';

interface BoardProps {
  isPlayerView?: boolean;
  syncedBoard?: HexState[];
  syncedWinner?: Team | null;
  syncedMatchWinner?: Team | null;
}

export const Board: React.FC<BoardProps> = ({ 
  isPlayerView = false,
  syncedBoard,
  syncedWinner,
  syncedMatchWinner
}) => {
  const { board: storeBoard, winner: storeWinner, matchWinner: storeMatchWinner, nextRound, unclaimHex, setActiveQuestion } = useGameStore();
  const { playClick, playWin } = useAudio();
  
  const board = isPlayerView ? (syncedBoard || []) : storeBoard;
  const winner = isPlayerView ? syncedWinner : storeWinner;
  const matchWinner = isPlayerView ? syncedMatchWinner : storeMatchWinner;

  const [hexToUnclaim, setHexToUnclaim] = useState<HexState | null>(null);
  const [hideWinScreen, setHideWinScreen] = useState(false);

  React.useEffect(() => {
    if (winner || matchWinner) {
      playWin();
      setHideWinScreen(false);
      
      // Celebrate with confetti
      if (matchWinner) {
        const end = Date.now() + 3000;
        const colors = matchWinner === 'team1' ? ['#ff416c', '#ff4b2b'] : ['#00b09b', '#96c93d'];
        (function frame() {
          confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors });
          confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors });
          if (Date.now() < end) requestAnimationFrame(frame);
        }());
      } else if (winner) {
        const color = winner === 'team1' ? '#ff416c' : '#00b09b';
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: [color, '#ffffff'] });
      }
    }
  }, [winner, matchWinner, playWin]);

  const hexWidth = 80;
  const hexHeight = 69.28;

  const handleHexClick = (hex: HexState) => {
    if (winner || matchWinner) return;
    playClick();
    if (hex.owner !== 'none') {
      setHexToUnclaim(hex);
      return;
    }
    const question = getRandomQuestionForLetter(hex.letter);
    if (question) {
      setActiveQuestion(hex.id, question);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div className="board-container">
        <div className="game-board" style={{ width: (4 * 0.75 + 1) * hexWidth, height: 5.5 * hexHeight, position: 'relative' }}>
          {/* Background borders */}
          <div style={{ position: 'absolute', top: -15, left: -20, right: -20, bottom: -15, zIndex: 0, borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 35, background: 'linear-gradient(to bottom, #ff416c, #ff4b2b)', boxShadow: '4px 0 10px rgba(255,65,108,0.2)' }} />
            <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 35, background: 'linear-gradient(to bottom, #ff416c, #ff4b2b)', boxShadow: '-4px 0 10px rgba(255,65,108,0.2)' }} />
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(to right, #00b09b, #96c93d)', boxShadow: '0 4px 10px rgba(0,176,155,0.2)' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(to right, #00b09b, #96c93d)', boxShadow: '0 -4px 10px rgba(0,176,155,0.2)' }} />
          </div>

          <div className="hex-grid" style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%' }}>
            {board.map((hex: HexState) => {
              const left = hex.colIndex * (hexWidth * 0.75);
              const top = hex.row * hexHeight;
              return (
                <div key={hex.id} style={{ position: 'absolute', left, top }}>
                  <Hexagon letter={hex.letter} owner={hex.owner} onClick={() => handleHexClick(hex)} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Win / MatchWinner Overlay */}
      {(winner || matchWinner) && !hideWinScreen && createPortal(
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          zIndex: 3000, animation: 'fadeIn 0.5s ease-out', fontFamily: "'Cairo', sans-serif", padding: '20px'
        }}>
          <div className="glass-panel" style={{ padding: '40px', borderRadius: '32px', textAlign: 'center', boxShadow: 'var(--shadow-lg)', maxWidth: '500px', width: '90%' }}>
            <h1 style={{ 
              fontSize: '2.5rem', fontWeight: '950', textAlign: 'center', lineHeight: '1.2', animation: 'popUp 0.6s ease-out',
              color: (matchWinner === 'team1' || winner === 'team1') ? '#ff416c' : '#00b09b',
              marginBottom: '10px'
            }}>
              {matchWinner 
                ? (matchWinner === 'team1' ? 'الفريق الأحمر يفوز بالمباراة!' : 'الفريق الأخضر يفوز بالمباراة!') 
                : (winner === 'team1' ? 'الفريق الأحمر يفوز بالجولة!' : 'الفريق الأخضر يفوز بالجولة!')}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', fontWeight: '700', marginBottom: '30px' }}>
              {matchWinner ? 'لقد تم حسم المباراة بنجاح 🏆' : 'هل أنت مستعد لمواصلة التحدي؟'}
            </p>

            <div style={{ display: 'flex', gap: '15px', direction: 'rtl', flexWrap: 'wrap', justifyContent: 'center' }}>
              {!matchWinner && !isPlayerView && (
                <button onClick={() => nextRound()} style={{ flex: '1 1 auto', padding: '14px 24px', background: 'linear-gradient(135deg, #36D1DC 0%, #5B86E5 100%)', border: 'none', borderRadius: '16px', color: 'white', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 8px 16px rgba(91, 134, 229, 0.3)' }}>الجولة التالية</button>
              )}
              {!isPlayerView && (
                <button onClick={() => useGameStore.getState().undoLastMove()} style={{ flex: '1 1 auto', padding: '14px 24px', background: 'linear-gradient(135deg, #ff9966 0%, #ff5e62 100%)', border: 'none', borderRadius: '16px', color: 'white', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 8px 16px rgba(255, 94, 98, 0.3)' }}>تراجع</button>
              )}
              <button onClick={() => setHideWinScreen(true)} style={{ flex: '1 1 auto', padding: '14px 24px', background: 'rgba(0,0,0,0.05)', border: '1px solid var(--glass-border)', borderRadius: '16px', color: '#666', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}>إغلاق</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Unclaim Confirmation */}
      {hexToUnclaim && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div className="glass-panel" style={{ background: 'white', padding: '30px', borderRadius: '24px', textAlign: 'center', maxWidth: '400px', width: '90%', direction: 'rtl', fontFamily: "'Cairo', sans-serif" }}>
            <h3 style={{ fontSize: '1.6rem', fontWeight: '900', marginBottom: '10px' }}>تفريغ الحرف؟</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '25px' }}>هل تريد إلغاء تحديد حرف ({hexToUnclaim.letter})؟</p>
            <div style={{ display: 'flex', gap: '15px' }}>
              <button onClick={() => { unclaimHex(hexToUnclaim.id); setHexToUnclaim(null); }} style={{ flex: 1, padding: '12px', background: 'var(--team1)', border: 'none', borderRadius: '12px', color: 'white', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}>نعم</button>
              <button onClick={() => setHexToUnclaim(null)} style={{ flex: 1, padding: '12px', background: '#eee', border: 'none', borderRadius: '12px', color: '#666', fontSize: '1.1rem', cursor: 'pointer' }}>إلغاء</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
