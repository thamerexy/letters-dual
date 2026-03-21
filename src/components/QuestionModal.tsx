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
  showAnswer?: boolean;  
  buzzQueue?: BuzzEvent[];
  hideQuestion?: boolean;
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
  hideQuestion = false,
}) => {
  const [showAnswerText, setShowAnswerText] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);

  // Reset state when newly opened
  React.useEffect(() => {
    if (isOpen) {
      setShowAnswerText(false);
      setTimeLeft(20);
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

  // Response Timer (15s) once someone buzzes
  const prevBuzzId = React.useRef<string | null>(null);
  React.useEffect(() => {
    const firstBuzz = buzzQueue[0];
    if (firstBuzz && firstBuzz.playerId !== prevBuzzId.current) {
      prevBuzzId.current = firstBuzz.playerId;
      // Reset timer to 15 seconds for the response
      setTimeLeft(15);
    } else if (!firstBuzz) {
      prevBuzzId.current = null;
    }
  }, [buzzQueue]);

  if (!isOpen) return null;

  const firstBuzz = buzzQueue[0];

  const content = (
    <div className="glass-panel" style={{
      background: 'white',
      padding: 'clamp(12px, 2.5vh, 24px) 24px',
      borderRadius: '24px',
      maxWidth: '92%',
      width: '480px',
      maxHeight: '90vh',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      textAlign: 'center',
      color: 'var(--text-primary)',
      boxShadow: 'var(--shadow-lg)',
      animation: 'popUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
        <div style={{ width: '38px', height: '38px', background: 'var(--team2-light)', border: '1px solid var(--team2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--team2)', fontSize: '1.2rem', fontWeight: '900' }}>
          {letter}
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '800' }}>سؤال الحرف</div>
      </div>

      {/* Buzz notification for admin */}
      {firstBuzz && (
        <div style={{
          background: firstBuzz.team === 'team1' ? 'var(--team1-light)' : 'var(--team2-light)',
          border: `1px solid ${firstBuzz.team === 'team1' ? '#ff416c66' : '#00b09b66'}`,
          borderRadius: '14px', padding: '10px 16px',
          marginBottom: 'clamp(5px, 1.5vh, 12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
          animation: 'fadeIn 0.3s ease-out',
        }}>
          <Zap size={18} fill={firstBuzz.team === 'team1' ? '#ff416c' : '#00b09b'} color={firstBuzz.team === 'team1' ? '#ff416c' : '#00b09b'} />
          <span style={{
            fontFamily: "'Cairo', sans-serif",
            fontWeight: '900', fontSize: 'clamp(0.9rem, 2vh, 1.1rem)',
            color: firstBuzz.team === 'team1' ? '#ff416c' : '#00b09b',
          }}>
            {firstBuzz.playerName} ضغط أولاً!
          </span>
        </div>
      )}

      {/* Timer Bar */}
      {!showAnswerText && (
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

      <p style={{ 
        fontSize: 'clamp(1rem, 4vh, 1.35rem)', fontWeight: '800', 
        margin: '12px 0 24px', color: 'var(--text-primary)', lineHeight: 1.5,
        fontStyle: (hideQuestion && !firstBuzz) ? 'italic' : 'normal',
        opacity: (hideQuestion && !firstBuzz) ? 0.6 : 1
      }}>
        {hideQuestion && !firstBuzz 
          ? 'المشرف يقرأ السؤال الآن... استعد للضغط!' 
          : question}
      </p>

      {!showAnswerText ? (
        <button
          onClick={() => setShowAnswerText(true)}
          style={{
            padding: '14px 40px',
            background: 'linear-gradient(135deg, #1e2030, #14161f)',
            color: 'white', border: 'none', borderRadius: '16px',
            cursor: 'pointer', fontSize: '1.1rem', fontWeight: '900',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            transition: 'all 0.2s', margin: '0 auto',
            minWidth: '200px'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          إظهار الجواب
        </button>
      ) : (
        <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
          {showAnswer && (
            <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '16px', margin: '8px 0 20px', border: '1px solid var(--glass-border)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '800', marginBottom: '4px' }}>الجواب الصحيح</div>
              <div style={{ color: '#111', margin: 0, fontSize: '1.4rem', fontWeight: '950' }}>{answer}</div>
            </div>
          )}

          <p style={{ marginBottom: '12px', fontSize: '1rem', fontWeight: '800', color: 'var(--text-secondary)' }}>
            من الذي أجاب إجابة صحيحة؟
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', margin: '15px 0', flexWrap: 'wrap' }}>
            <button
              onClick={() => onAnswerComplete('team1')}
              style={{ flex: 1, padding: '16px 10px', background: 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)', color: 'white', border: 'none', borderRadius: '16px', cursor: 'pointer', fontSize: '1.1rem', fontWeight: '900', boxShadow: '0 8px 20px rgba(255, 65, 108, 0.25)', transition: 'all 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              الفريق الأحمر
            </button>
            <button
              onClick={() => onAnswerComplete('team2')}
              style={{ flex: 1, padding: '16px 10px', background: 'linear-gradient(135deg, #00b09b 0%, #96c93d 100%)', color: 'white', border: 'none', borderRadius: '16px', cursor: 'pointer', fontSize: '1.1rem', fontWeight: '900', boxShadow: '0 8px 20px rgba(0, 176, 155, 0.25)', transition: 'all 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              الفريق الأخضر
            </button>
          </div>

          <div style={{ marginTop: '10px' }}>
            <button
              onClick={() => onAnswerComplete(null)}
              style={{ padding: '12px 20px', background: 'rgba(0,0,0,0.04)', color: '#888', border: '1px solid var(--glass-border)', borderRadius: '14px', cursor: 'pointer', fontSize: '1rem', fontWeight: '700', width: '100%', transition: 'all 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.06)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
            >
              🎉 تخطي / لم يجب أحد
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
