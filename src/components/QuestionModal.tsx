import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import type { Team } from '../store/gameStore';
import type { BuzzEvent } from '../store/roomStore';
import { Zap } from 'lucide-react';

interface QuestionModalProps {
  isOpen: boolean;
  letter: string;
  question: string;
  answer: string;
  onAnswerComplete: (claimedBy: Team | null) => void;
  onClose: () => void;
  inline?: boolean;
  showAnswer?: boolean;  // Admin always true; player view not used (player has its own UI)
  buzzQueue?: BuzzEvent[];
}

export const QuestionModal: React.FC<QuestionModalProps> = ({
  isOpen,
  letter,
  question,
  answer,
  onAnswerComplete,
  onClose,
  showAnswer = true,
  buzzQueue = [],
}) => {
  const [showAnswerText, setShowAnswerText] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);

  // Reset state when newly opened
  React.useEffect(() => {
    if (isOpen) {
      setShowAnswerText(false);
      setTimeLeft(30);
    }
  }, [isOpen]);

  // Timer logic
  React.useEffect(() => {
    if (!isOpen || showAnswerText || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, showAnswerText, timeLeft]);

  if (!isOpen) return null;

  const firstBuzz = buzzQueue[0];

  const content = (
    <div style={{
      background: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(245,245,245,0.95) 100%)',
      padding: 'clamp(12px, 2.5vh, 20px) 20px',
      borderRadius: '20px',
      maxWidth: '92%',
      width: '480px',
      maxHeight: '85vh',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      textAlign: 'center',
      color: '#222',
      boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
      border: '1px solid rgba(255,255,255,0.5)',
      animation: 'slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    }}>
      <h2 style={{ fontSize: 'clamp(1.4rem, 4.5vh, 2rem)', margin: '0 0 8px', color: '#111' }}>
        حرف <span style={{ color: '#00b09b' }}>{letter}</span>
      </h2>

      {/* Buzz notification for admin */}
      {firstBuzz && (
        <div style={{
          background: firstBuzz.team === 'team1' ? 'rgba(255,65,108,0.12)' : 'rgba(0,176,155,0.12)',
          border: `1px solid ${firstBuzz.team === 'team1' ? 'rgba(255,65,108,0.4)' : 'rgba(0,176,155,0.4)'}`,
          borderRadius: '12px', padding: '8px 14px',
          marginBottom: 'clamp(5px, 1.5vh, 10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          animation: 'fadeIn 0.3s ease-out',
        }}>
          <Zap size={16} color={firstBuzz.team === 'team1' ? '#ff416c' : '#00b09b'} />
          <span style={{
            fontFamily: "'Cairo', sans-serif",
            fontWeight: '800', fontSize: 'clamp(0.8rem, 2vh, 1rem)',
            color: firstBuzz.team === 'team1' ? '#cc2244' : '#007a6a',
          }}>
            ⚡ {firstBuzz.playerName} ضغط أولاً!
          </span>
        </div>
      )}

      {/* Timer Bar */}
      {!showAnswerText && (
        <div style={{ padding: '0 10px', marginBottom: 'clamp(5px, 1.5vh, 10px)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Cairo', sans-serif", fontSize: 'clamp(0.8rem, 2.5vh, 1rem)', fontWeight: 'bold', color: timeLeft <= 5 ? '#ff416c' : '#555', transition: 'color 0.3s' }}>
            <span>{timeLeft}s</span>
            <span>الوقت المتبقي</span>
          </div>
          <div style={{ width: '100%', height: '8px', background: '#e0e0e0', borderRadius: '4px', overflow: 'hidden', marginTop: '5px' }}>
            <div style={{
              height: '100%',
              width: `${(timeLeft / 30) * 100}%`,
              background: timeLeft <= 5 ? 'linear-gradient(90deg, #ff416c, #ff4b2b)' : 'linear-gradient(90deg, #00b09b, #96c93d)',
              transition: 'width 1s linear, background 0.3s ease'
            }} />
          </div>
        </div>
      )}

      <p style={{ fontSize: 'clamp(1rem, 4vh, 1.4rem)', fontWeight: '800', margin: '10px 0 20px', color: '#333' }}>
        {question}
      </p>

      {!showAnswerText ? (
        <button
          onClick={() => setShowAnswerText(true)}
          style={{
            padding: 'clamp(8px, 2.5vh, 15px) clamp(20px, 5vw, 40px)',
            background: 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)',
            color: 'white', border: 'none', borderRadius: '12px',
            cursor: 'pointer', fontSize: 'clamp(1rem, 3.5vh, 1.3rem)', fontWeight: 'bold',
            boxShadow: '0 10px 20px -10px rgba(33, 147, 176, 0.8)',
            transition: 'transform 0.2s', margin: '0 auto',
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          إظهار الجواب
        </button>
      ) : (
        <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
          {showAnswer && (
            <div style={{ background: 'rgba(0,0,0,0.05)', padding: 'clamp(10px, 3vh, 20px)', borderRadius: '12px', margin: 'clamp(5px, 2vh, 15px) 0', border: '1px solid rgba(0,0,0,0.1)' }}>
              <h3 style={{ color: '#222', margin: 0, fontSize: 'clamp(1.1rem, 4vh, 1.4rem)' }}>الجواب: {answer}</h3>
            </div>
          )}

          <p style={{ marginTop: 'clamp(10px, 3vh, 25px)', marginBottom: 'clamp(5px, 2vh, 15px)', fontSize: 'clamp(1rem, 3.5vh, 1.3rem)', fontWeight: '800', color: '#222' }}>
            من الذي أجاب إجابة صحيحة؟
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(10px, 3vw, 20px)', margin: 'clamp(5px, 2vh, 20px) 0', flexWrap: 'wrap' }}>
            <button
              onClick={() => onAnswerComplete('team1')}
              style={{ flex: 1, padding: 'clamp(10px, 3vh, 15px) 10px', background: 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: 'clamp(0.9rem, 3vh, 1.2rem)', fontWeight: 'bold', boxShadow: '0 8px 15px -5px rgba(255, 65, 108, 0.6)' }}
            >
              الفريق الأحمر
            </button>
            <button
              onClick={() => onAnswerComplete('team2')}
              style={{ flex: 1, padding: 'clamp(10px, 3vh, 15px) 10px', background: 'linear-gradient(135deg, #00b09b 0%, #96c93d 100%)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: 'clamp(0.9rem, 3vh, 1.2rem)', fontWeight: 'bold', boxShadow: '0 8px 15px -5px rgba(0, 176, 155, 0.6)' }}
            >
              الفريق الأخضر
            </button>
          </div>

          <div style={{ marginTop: 'clamp(5px, 1.5vh, 15px)' }}>
            <button
              onClick={() => onAnswerComplete(null)}
              style={{ padding: 'clamp(8px, 2.5vh, 12px) 20px', background: '#e0e0e0', color: '#555', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: 'clamp(0.9rem, 3vh, 1.1rem)', fontWeight: '600', width: '100%' }}
            >
              لم يجب أحد بصحيح (تخطي)
            </button>
          </div>
        </div>
      )}

      <button
        onClick={onClose}
        style={{ marginTop: 'clamp(10px, 3vh, 30px)', display: 'block', width: '100%', background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', textDecoration: 'underline', fontSize: 'clamp(0.8rem, 2.5vh, 1rem)' }}
      >
        إغلاق دون تغيير
      </button>
    </div>
  );

  return createPortal(
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(10,10,10,0.7)',
      backdropFilter: 'blur(8px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 1000, direction: 'rtl',
      animation: 'fadeIn 0.3s ease-out',
      padding: '20px',
    }}>
      {content}
    </div>,
    document.body
  );
};
