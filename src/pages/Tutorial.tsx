import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Zap } from 'lucide-react';

export const Tutorial: React.FC = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = 5;

  const slides = [
    {
      id: 1,
      title: '1. الانضمام للغرفة',
      description: 'أدخل رمز الغرفة المكون من 4 أحرف واسمك، ثم اضغط على "انضم الآن" لتبدأ التحدي!',
      image: 'tutorial_assets/join.jpg',
      highlightId: 'h-join',
      bg: 'transparent'
    },
    {
      id: 2,
      title: '2. سرعة البديهة (الضغط)',
      description: 'كن الأسرع في الضغط على زر BUZZ لتحصل على فرصة الإجابة على السؤال!',
      image: 'tutorial_assets/buzz.jpg',
      highlightId: 'h-buzz',
      bg: 'linear-gradient(transparent, #00b09bcc)',
      hasZap: true
    },
    {
      id: 3,
      title: '3. كيف تفوز بجولة؟',
      description: 'الفريق الأحمر يربط الجانب اليمين باليسار، والأخضر من الأعلى للأسفل!',
      image: 'tutorial_assets/board.jpg',
      highlightId: 'h-win-both',
      bg: 'linear-gradient(transparent, #1a1a1acc)'
    },
    {
      id: 4,
      title: '4. ميزة علامة الاستفهام (?)',
      description: 'إذا فزت بحرف (؟)، يحق لك طلب "تفريغ" أي حرف سبق للفريق المنافس السيطرة عليه!',
      image: 'tutorial_assets/board.jpg',
      highlightId: 'h-wildcard',
      bg: 'linear-gradient(transparent, #f7971ecc)'
    },
    {
      id: 5,
      title: '5. خاصية بقاء الشاشة (Always Awake)',
      description: 'اضغط على أيقونة الشمس لتضمن بقاء شاشة هاتفك مضيئة طوال فترة اللعب!',
      image: 'tutorial_assets/board.jpg',
      highlightId: 'h-awake',
      bg: 'linear-gradient(transparent, #ffb400cc)'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#111', color: 'white',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Cairo', sans-serif", direction: 'rtl'
    }}>
      <div style={{
        width: '100%', maxWidth: '450px', height: '100vh',
        background: '#f8f9fa', position: 'relative', overflow: 'hidden'
      }}>
        {/* Slides */}
        {slides.map((slide, index) => (
          <div key={slide.id} style={{
            position: 'absolute', inset: 0,
            opacity: currentSlide === index ? 1 : 0,
            transition: 'opacity 0.8s ease-in-out',
            display: 'flex', flexDirection: 'column',
            pointerEvents: currentSlide === index ? 'auto' : 'none'
          }}>
            <img src={slide.image} alt="" style={{ width: '100%', height: 'auto' }} />
            
            {/* Highlights */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              {currentSlide === 0 && <div className="highlight" style={{ top: '54%', left: '14%', width: '72%', height: '12%', borderColor: '#00b09b', boxShadow: '0 0 20px #00b09b' }} />}
              {currentSlide === 1 && (
                <>
                  <div className="highlight" style={{ top: '60%', left: '10%', width: '80%', height: '11%', borderColor: '#ffd200', boxShadow: '0 0 25px #ffd200', borderRadius: '20px' }} />
                  <div className="zap" style={{ top: '60%', left: '45%', position: 'absolute' }}><Zap size={48} color="#ffd200" fill="#ffd200" /></div>
                </>
              )}
              {currentSlide === 2 && (
                <>
                  <div className="highlight" style={{ top: '53.5%', left: '14%', width: '3%', height: '38%', borderColor: '#ff416c', boxShadow: '0 0 15px #ff416c' }} />
                  <div className="highlight" style={{ top: '48%', left: '16%', width: '68%', height: '3%', borderColor: '#00b09b', boxShadow: '0 0 15px #00b09b' }} />
                </>
              )}
              {currentSlide === 3 && <div className="highlight" style={{ top: '82%', left: '42%', width: '14%', height: '8.5%', borderColor: '#f7971e', boxShadow: '0 0 20px #f7971e' }} />}
              {currentSlide === 4 && <div className="highlight" style={{ top: '9%', left: '4%', width: '15%', height: '4%', borderColor: '#ffb400', boxShadow: '0 0 15px #ffb400' }} />}
            </div>

            {/* Description Box */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: slide.bg !== 'transparent' ? slide.bg : 'linear-gradient(transparent, rgba(0,0,0,0.85))',
              padding: '40px 20px 80px', textAlign: 'center',
              transform: currentSlide === index ? 'translateY(0)' : 'translateY(50px)',
              opacity: currentSlide === index ? 1 : 0,
              transition: 'all 0.6s ease-out', zIndex: 10
            }}>
              <h2 style={{ margin: '0 0 10px', fontWeight: 900, fontSize: '1.6rem', color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>{slide.title}</h2>
              <p style={{ margin: '0', fontSize: '1.1rem', color: '#eee', fontWeight: 700, lineHeight: 1.5 }}>{slide.description}</p>
            </div>
          </div>
        ))}

        {/* Navigation Dots */}
        <div style={{
          position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: '8px', zIndex: 20
        }}>
          {slides.map((_, i) => (
            <div key={i} onClick={() => setCurrentSlide(i)} style={{
              width: currentSlide === i ? '24px' : '8px',
              height: '8px', borderRadius: '4px',
              background: currentSlide === i ? 'white' : 'rgba(255,255,255,0.4)',
              cursor: 'pointer', transition: 'all 0.3s'
            }} />
          ))}
        </div>

        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          style={{
            position: 'absolute', top: '20px', left: '20px',
            background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '12px',
            padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px',
            color: '#333', fontWeight: '900', cursor: 'pointer', zIndex: 100,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)', direction: 'ltr'
          }}
        >
          <ArrowRight size={18} /> Back
        </button>
      </div>

      <style>{`
        .highlight {
          position: absolute;
          border-width: 4px;
          border-style: solid;
          border-radius: 10px;
          opacity: 0;
          transform: scale(0.8);
          animation: highlight-pop 0.5s forwards 0.3s;
        }
        @keyframes highlight-pop {
          to { opacity: 1; transform: scale(1); }
        }
        .zap {
          animation: zap-anim 1s infinite;
        }
        @keyframes zap-anim { 
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
