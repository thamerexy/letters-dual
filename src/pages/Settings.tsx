import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { requiredRoundsToWin, setRequiredRounds } = useGameStore();

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'flex-start',
      background: 'radial-gradient(circle at 50% 50%, rgb(40, 40, 40) 0%, rgb(10, 10, 10) 100%)',
      color: 'white', padding: '40px 20px',
      direction: 'rtl', fontFamily: "'Cairo', sans-serif"
    }}>
      <div style={{ width: '100%', maxWidth: '600px', display: 'flex', alignItems: 'center', marginBottom: '40px' }}>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '10px' }}
        >
          <ArrowLeft size={32} />
        </button>
        <h1 style={{ fontSize: '2.5rem', margin: '0 auto', transform: 'translateX(-20px)' }}>الإعدادات</h1>
      </div>

      {/* Rounds Required Configurator */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '15px',
        width: '100%', maxWidth: '500px', flexDirection: 'column', gap: '20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <Trophy size={32} color="#ff9966" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>نظام الجولات</span>
            <span style={{ fontSize: '1rem', color: '#aaa' }}>المطلوب للفوز بالمباراة</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {[1, 2, 3].map(rounds => (
            <button
              key={rounds}
              onClick={() => setRequiredRounds(rounds)}
              style={{
                padding: '12px 20px',
                background: requiredRoundsToWin === rounds ? 'linear-gradient(135deg, #ff9966 0%, #ff5e62 100%)' : '#444',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
                color: 'white', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer',
                transition: 'all 0.3s',
                boxShadow: requiredRoundsToWin === rounds ? '0 5px 15px rgba(255, 94, 98, 0.4)' : 'none'
              }}
            >
              {rounds === 1 ? 'جولة واحدة' : rounds === 2 ? 'أفضل من 3' : 'أفضل من 5'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
