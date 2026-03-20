import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, Download } from 'lucide-react';
import { fetchAllQuestions } from '../services/questions';
import { createRoom, joinRoom, useRoomStore } from '../store/roomStore';
import { subscribeToRoom } from '../services/realtime';

type Mode = 'select' | 'admin-loading' | 'player-join';

export const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('select');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    const loadDB = async () => {
      const success = await fetchAllQuestions();
      if (success) setIsLoaded(true);
    };
    loadDB();
  }, []);

  const handleAdminClick = async () => {
    setMode('admin-loading');
    setIsLoading(true);
    setError(null);
    const result = await createRoom();
    if (!result) {
      setError('فشل إنشاء الغرفة، تحقق من الاتصال بالإنترنت');
      setMode('select');
      setIsLoading(false);
      return;
    }
    subscribeToRoom(result.roomCode, result.roomId);
    setIsLoading(false);
    navigate('/lobby-admin');
  };

  const handlePlayerJoin = async () => {
    if (!roomCode.trim() || !playerName.trim()) {
      setError('يرجى إدخال رمز الغرفة واسمك');
      return;
    }
    setIsLoading(true);
    setError(null);
    const success = await joinRoom(roomCode.trim(), playerName.trim());
    if (!success) {
      setError('لم يتم العثور على الغرفة، تحقق من الرمز وحاول مرة أخرى');
      setIsLoading(false);
      return;
    }
    // Subscribe to room after joining
    const store = useRoomStore.getState();
    if (store.roomId && store.roomCode) {
      subscribeToRoom(store.roomCode, store.roomId);
    }
    navigate('/lobby-player');
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 20%, rgb(30, 40, 50) 0%, rgb(8, 8, 15) 100%)',
      color: 'white',
      padding: '20px',
      overflow: 'hidden',
      fontFamily: "'Cairo', sans-serif",
      direction: 'rtl',
    }}>
      {/* Logo */}
      <div style={{ marginBottom: '30px', animation: 'fadeInDown 0.8s ease-out' }}>
        <img
          src="./logo.png"
          alt="الحروف ثنائية"
          style={{ width: '180px', height: 'auto', objectFit: 'contain',
            filter: 'drop-shadow(0 10px 30px rgba(0, 176, 155, 0.4))' }}
        />
      </div>

      {/* Loading indicator */}
      {!isLoaded && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', color: '#aaa', fontSize: '1rem' }}>
          <Download size={18} className="spin-animation" />
          جاري تحميل قاعدة الأسئلة...
        </div>
      )}

      {error && (
        <div style={{ color: '#ff416c', background: 'rgba(255,65,108,0.1)', border: '1px solid rgba(255,65,108,0.3)',
          borderRadius: '12px', padding: '12px 20px', marginBottom: '20px', fontSize: '1rem', textAlign: 'center', maxWidth: '380px' }}>
          {error}
        </div>
      )}

      {mode === 'select' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '380px', animation: 'fadeInUp 0.8s ease-out' }}>
          {/* Admin Card */}
          <button
            onClick={handleAdminClick}
            disabled={!isLoaded}
            style={{
              display: 'flex', alignItems: 'center', gap: '20px',
              padding: '24px 28px',
              background: isLoaded
                ? 'linear-gradient(135deg, rgba(255,94,98,0.2) 0%, rgba(255,65,108,0.15) 100%)'
                : 'rgba(50,50,50,0.5)',
              border: isLoaded ? '1px solid rgba(255,94,98,0.5)' : '1px solid #333',
              borderRadius: '20px',
              color: isLoaded ? 'white' : '#666',
              cursor: isLoaded ? 'pointer' : 'not-allowed',
              textAlign: 'right',
              direction: 'rtl',
              transition: 'all 0.3s',
              boxShadow: isLoaded ? '0 10px 30px rgba(255,65,108,0.2)' : 'none',
            }}
            onMouseOver={(e) => { if (!isLoaded) return; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 15px 40px rgba(255,65,108,0.35)'; }}
            onMouseOut={(e) => { if (!isLoaded) return; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(255,65,108,0.2)'; }}
          >
            <div style={{ background: 'linear-gradient(135deg, #ff416c, #ff4b2b)', borderRadius: '14px', padding: '14px', flexShrink: 0 }}>
              <Shield size={28} color="white" />
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '4px' }}>شاشة المدير</div>
              <div style={{ fontSize: '0.95rem', color: '#aaa' }}>أنشئ غرفة جديدة وأدِر المباراة</div>
            </div>
          </button>

          {/* Player Card */}
          <button
            onClick={() => { setMode('player-join'); setError(null); }}
            disabled={!isLoaded}
            style={{
              display: 'flex', alignItems: 'center', gap: '20px',
              padding: '24px 28px',
              background: isLoaded
                ? 'linear-gradient(135deg, rgba(0,176,155,0.2) 0%, rgba(150,201,61,0.15) 100%)'
                : 'rgba(50,50,50,0.5)',
              border: isLoaded ? '1px solid rgba(0,176,155,0.5)' : '1px solid #333',
              borderRadius: '20px',
              color: isLoaded ? 'white' : '#666',
              cursor: isLoaded ? 'pointer' : 'not-allowed',
              textAlign: 'right',
              direction: 'rtl',
              transition: 'all 0.3s',
              boxShadow: isLoaded ? '0 10px 30px rgba(0,176,155,0.2)' : 'none',
            }}
            onMouseOver={(e) => { if (!isLoaded) return; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 15px 40px rgba(0,176,155,0.35)'; }}
            onMouseOut={(e) => { if (!isLoaded) return; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,176,155,0.2)'; }}
          >
            <div style={{ background: 'linear-gradient(135deg, #00b09b, #96c93d)', borderRadius: '14px', padding: '14px', flexShrink: 0 }}>
              <Users size={28} color="white" />
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '4px' }}>شاشة اللاعبين</div>
              <div style={{ fontSize: '0.95rem', color: '#aaa' }}>انضم إلى غرفة وألعب مع فريقك</div>
            </div>
          </button>
        </div>
      )}

      {mode === 'admin-loading' && (
        <div style={{ textAlign: 'center', color: '#aaa', fontSize: '1.2rem', animation: 'fadeIn 0.5s ease-out' }}>
          <div className="spin-animation" style={{ display: 'inline-block', marginBottom: '15px' }}>
            <Download size={40} />
          </div>
          <div>جاري إنشاء الغرفة...</div>
        </div>
      )}

      {mode === 'player-join' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', maxWidth: '380px', animation: 'fadeInUp 0.5s ease-out' }}>
          <h2 style={{ textAlign: 'center', fontSize: '1.6rem', margin: '0 0 10px', color: '#00b09b' }}>بيانات الانضمام</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '1rem', color: '#aaa' }}>رمز الغرفة</label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="مثال: ABCD"
              maxLength={4}
              style={{
                padding: '14px 18px', borderRadius: '14px',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'white', fontSize: '1.6rem', fontWeight: '800',
                textAlign: 'center', letterSpacing: '6px',
                fontFamily: "'Cairo', sans-serif", outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '1rem', color: '#aaa' }}>اسمك</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="أدخل اسمك"
              maxLength={20}
              style={{
                padding: '14px 18px', borderRadius: '14px',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'white', fontSize: '1.3rem', fontWeight: '600',
                textAlign: 'right', fontFamily: "'Cairo', sans-serif", outline: 'none',
              }}
            />
          </div>

          <button
            onClick={handlePlayerJoin}
            disabled={isLoading}
            style={{
              padding: '16px', background: 'linear-gradient(135deg, #00b09b, #96c93d)',
              border: 'none', borderRadius: '14px', color: 'white',
              fontSize: '1.3rem', fontWeight: '800', cursor: isLoading ? 'wait' : 'pointer',
              boxShadow: '0 10px 25px rgba(0,176,155,0.4)', marginTop: '6px',
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? 'جاري الانضمام...' : 'انضم الآن'}
          </button>

          <button
            onClick={() => { setMode('select'); setError(null); }}
            style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: '1rem', padding: '8px' }}
          >
            ← رجوع
          </button>
        </div>
      )}

      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .spin-animation {
          animation: spin 1s linear infinite;
        }
        input:focus {
          border-color: rgba(0, 176, 155, 0.6) !important;
          box-shadow: 0 0 0 3px rgba(0, 176, 155, 0.15) !important;
        }
      `}</style>
    </div>
  );
};
