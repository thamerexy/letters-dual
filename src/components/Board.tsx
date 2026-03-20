import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Hexagon } from './Hexagon';
import { useGameStore } from '../store/gameStore';
import type { HexState } from '../store/gameStore';
import { getRandomQuestionForLetter } from '../services/questions';
import { useAudio } from '../hooks/useAudio';

// Config moved to gameStore.ts

export const Board: React.FC = () => {
  const { board, winner, matchWinner, nextRound, unclaimHex, setActiveQuestion } = useGameStore();
  const { playClick, playWin } = useAudio();
  
  const [hexToUnclaim, setHexToUnclaim] = useState<HexState | null>(null);
  const [hideWinScreen, setHideWinScreen] = useState(false);

  React.useEffect(() => {
    if (winner || matchWinner) {
      playWin();
      setHideWinScreen(false); // Reset dismiss state when someone wins anew
    }
  }, [winner, matchWinner, playWin]);

  const hexWidth = 80;
  const hexHeight = 69.28;

  const handleHexClick = (hex: HexState) => {
    if (winner || matchWinner) return;
    
    // Play interaction sound
    playClick();

    // If it's already claimed, prompt to unclaim
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
          <div style={{ position: 'absolute', top: -15, left: -20, right: -20, bottom: -15, zIndex: 0, borderRadius: '16px', overflow: 'hidden' }}>
            {/* Red borders left and right */}
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 35, background: 'linear-gradient(to bottom, #ff416c, #ff4b2b)', boxShadow: '5px 0 15px rgba(255,65,108,0.5)' }} />
            <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 35, background: 'linear-gradient(to bottom, #ff416c, #ff4b2b)', boxShadow: '-5px 0 15px rgba(255,65,108,0.5)' }} />
            {/* Green borders top and bottom */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(to right, #00b09b, #96c93d)', boxShadow: '0 5px 15px rgba(0,176,155,0.5)' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(to right, #00b09b, #96c93d)', boxShadow: '0 -5px 15px rgba(0,176,155,0.5)' }} />
          </div>

          <div className="hex-grid" style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%' }}>
        {board.map((hex: HexState) => {
          const left = hex.colIndex * (hexWidth * 0.75);
          const top = hex.row * hexHeight;
          
          return (
            <div key={hex.id} style={{ position: 'absolute', left, top }}>
              <Hexagon 
                letter={hex.letter} 
                owner={hex.owner}
                onClick={() => handleHexClick(hex)}
              />
            </div>
          );
        })}
      </div>
      
      {(winner || matchWinner) && !hideWinScreen && createPortal(
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000,
          animation: 'fadeIn 0.5s ease-out',
          fontFamily: "'Cairo', sans-serif",
          overflowY: 'auto',
          maxHeight: '100vh',
          padding: '20px',
          boxSizing: 'border-box'
        }}>
          <h1 style={{ 
            fontSize: '2.5rem', 
            fontWeight: '900',
            color: (matchWinner === 'team1' || winner === 'team1') ? '#ff416c' : '#00b09b',
            textShadow: `0 5px 30px ${(matchWinner === 'team1' || winner === 'team1') ? 'rgba(255,65,108,0.6)' : 'rgba(0,176,155,0.6)'}`,
            marginBottom: '10px',
            textAlign: 'center',
            lineHeight: '1.2',
            animation: 'slideUp 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            marginTop: 'auto'
          }}>
            {matchWinner 
              ? (matchWinner === 'team1' ? 'الفريق الأحمر يفوز بالمباراة!' : 'الفريق الأخضر يفوز بالمباراة!') 
              : (winner === 'team1' ? 'الفريق الأحمر يفوز بالجولة!' : 'الفريق الأخضر يفوز بالجولة!')}
          </h1>
          <p style={{ color: 'white', fontSize: '1.1rem', animation: 'fadeIn 1s ease-out 0.5s both', marginBottom: '30px', textAlign: 'center' }}>
            {matchWinner ? 'لقد تم حسم المباراة بنجاح 🏆' : 'هل أنت مستعد لمواصلة التحدي؟'}
          </p>

          <div style={{ display: 'flex', gap: '15px', animation: 'fadeIn 1s ease-out 0.8s both', direction: 'rtl', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 'auto', width: '100%', maxWidth: '500px' }}>
            
            {!matchWinner && (
              <button
                onClick={() => {
                  setHideWinScreen(true); // Technically not necessary since nextRound wipes winner, but good practice
                  nextRound();
                }}
                style={{
                  flex: '1 1 auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px 15px',
                  background: 'linear-gradient(135deg, #36D1DC 0%, #5B86E5 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 5px 15px rgba(91, 134, 229, 0.4)'
                }}
              >
                الجولة التالية
              </button>
            )}

            <button
              onClick={() => {
                useGameStore.getState().undoLastMove();
              }}
              style={{
                flex: '1 1 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 15px',
                background: 'linear-gradient(135deg, #ff9966 0%, #ff5e62 100%)',
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 5px 15px rgba(255, 94, 98, 0.4)'
              }}
            >
              تراجع عن الخطوة
            </button>
            <button
              onClick={() => setHideWinScreen(true)}
              style={{
                flex: '1 1 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 15px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                color: 'white',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                backdropFilter: 'blur(10px)'
              }}
            >
              إغلاق اللوحة
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Unclaim Confirmation Modal */}
      {hexToUnclaim && createPortal(
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          direction: 'rtl',
          fontFamily: "'Cairo', sans-serif"
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)',
            padding: '20px',
            borderRadius: '20px',
            border: '1px solid rgba(255,255,255,0.1)',
            textAlign: 'center',
            maxWidth: '90%',
            width: '400px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ color: 'white', fontSize: '1.5rem', margin: '0 0 15px', overflowWrap: 'break-word' }}> {/* Smaller font size */}
              تفريغ الحرف؟
            </h3>
            <p style={{ color: '#ccc', fontSize: '1rem', marginBottom: '25px', overflowWrap: 'break-word' }}> {/* Smaller font size */}
              هل أنت متأكد أنك تريد إلغاء تحديد حرف ({hexToUnclaim.letter}) وإعادته للون الرمادي؟
            </p>
            <div style={{ display: 'flex', gap: '15px' }}>
              <button
                onClick={() => {
                  unclaimHex(hexToUnclaim.id);
                  setHexToUnclaim(null);
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                نعم، إفراغ
              </button>
              <button
                onClick={() => setHexToUnclaim(null)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '1.1rem',
                  cursor: 'pointer'
                }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
        </div>
      </div>
    </div>
  );
};
