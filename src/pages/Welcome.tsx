import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, Download } from 'lucide-react';
import { fetchAllQuestions } from '../services/questions';
import { generateRoomCode, useRoomStore } from '../store/roomStore';
import type { PlayerPresence } from '../store/roomStore';
import { subscribeToRoom } from '../services/realtime';

type Mode = 'select' | 'admin-loading' | 'player-join' | 'player-connecting';

export const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('select');
  const [isLoaded, setIsLoaded] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    fetchAllQuestions().then(success => { if (success) setIsLoaded(true); });
  }, []);

  const handleAdminClick = async () => {
    setMode('admin-loading');
    setError(null);
    const code = generateRoomCode();
    const clientId = useRoomStore.getState().clientId;
    const presence: PlayerPresence = { clientId, name: 'Admin', team: 'none', isAdmin: true };

    useRoomStore.setState({ roomCode: code, isAdmin: true, myName: 'Admin' });

    try {
      await subscribeToRoom(code, presence);
      navigate('/lobby-admin');
    } catch {
      setError('فشل الاتصال. تحقق من الإنترنت وحاول مرة أخرى.');
      setMode('select');
    }
  };

  const handlePlayerJoin = async () => {
    const code = roomCode.toUpperCase().trim();
    const name = playerName.trim();
    if (!code || code.length !== 4) { setError('أدخل رمز الغرفة المكون من 4 أحرف'); return; }
    if (!name) { setError('أدخل اسمك'); return; }

    setMode('player-connecting');
    setError(null);

    const clientId = useRoomStore.getState().clientId;
    const presence: PlayerPresence = { clientId, name, team: 'none', isAdmin: false };

    useRoomStore.setState({ roomCode: code, isAdmin: false, myName: name });

    try {
      await subscribeToRoom(code, presence);
      navigate('/lobby-player');
    } catch {
      setError('لم يتم إيجاد الغرفة. تأكد من الرمز والاتصال بالإنترنت.');
      setMode('player-join');
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 20%, rgb(28, 38, 50) 0%, rgb(8, 8, 15) 100%)',
      color: 'white', padding: '20px', overflow: 'hidden',
      fontFamily: "'Cairo', sans-serif", direction: 'rtl',
    }}>
      {/* Logo */}
      <div style={{ marginBottom: '28px', animation: 'fadeInDown 0.8s ease-out' }}>
        <img src="./logo.png" alt="الحروف ثنائية" style={{
          width: '160px', height: 'auto', objectFit: 'contain',
          filter: 'drop-shadow(0 10px 30px rgba(0, 176, 155, 0.4))'
        }} />
      </div>

      {/* Loading bar */}
      {!isLoaded && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', color: '#666', fontSize: '0.95rem' }}>
          <Download size={16} className="spin-animation" />
          جاري تحميل الأسئلة...
        </div>
      )}

      {error && (
        <div style={{
          color: '#ff416c', background: 'rgba(255,65,108,0.1)', border: '1px solid rgba(255,65,108,0.3)',
          borderRadius: '12px', padding: '10px 18px', marginBottom: '16px',
          fontSize: '0.95rem', textAlign: 'center', maxWidth: '360px', animation: 'fadeIn 0.3s'
        }}>{error}</div>
      )}

      {(mode === 'select') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', maxWidth: '360px', animation: 'fadeInUp 0.8s ease-out' }}>
          {/* Admin Card */}
          <button
            onClick={handleAdminClick}
            disabled={!isLoaded}
            style={{
              display: 'flex', alignItems: 'center', gap: '18px', padding: '22px 24px',
              background: isLoaded ? 'linear-gradient(135deg, rgba(255,94,98,0.18) 0%, rgba(255,65,108,0.12) 100%)' : 'rgba(40,40,40,0.5)',
              border: isLoaded ? '1px solid rgba(255,94,98,0.45)' : '1px solid #2a2a2a',
              borderRadius: '18px', color: isLoaded ? 'white' : '#555',
              cursor: isLoaded ? 'pointer' : 'not-allowed', textAlign: 'right',
              transition: 'all 0.3s', boxShadow: isLoaded ? '0 8px 28px rgba(255,65,108,0.18)' : 'none',
            }}
            onMouseOver={(e) => { if (!isLoaded) return; e.currentTarget.style.transform = 'translateY(-3px)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <div style={{ background: 'linear-gradient(135deg, #ff416c, #ff4b2b)', borderRadius: '12px', padding: '12px', flexShrink: 0 }}>
              <Shield size={26} color="white" />
            </div>
            <div>
              <div style={{ fontSize: '1.35rem', fontWeight: '800', marginBottom: '3px' }}>شاشة المدير</div>
              <div style={{ fontSize: '0.9rem', color: '#999' }}>أنشئ غرفة جديدة وأدِر المباراة</div>
            </div>
          </button>

          {/* Player Card */}
          <button
            onClick={() => { setMode('player-join'); setError(null); }}
            disabled={!isLoaded}
            style={{
              display: 'flex', alignItems: 'center', gap: '18px', padding: '22px 24px',
              background: isLoaded ? 'linear-gradient(135deg, rgba(0,176,155,0.18) 0%, rgba(150,201,61,0.12) 100%)' : 'rgba(40,40,40,0.5)',
              border: isLoaded ? '1px solid rgba(0,176,155,0.45)' : '1px solid #2a2a2a',
              borderRadius: '18px', color: isLoaded ? 'white' : '#555',
              cursor: isLoaded ? 'pointer' : 'not-allowed', textAlign: 'right',
              transition: 'all 0.3s', boxShadow: isLoaded ? '0 8px 28px rgba(0,176,155,0.18)' : 'none',
            }}
            onMouseOver={(e) => { if (!isLoaded) return; e.currentTarget.style.transform = 'translateY(-3px)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <div style={{ background: 'linear-gradient(135deg, #00b09b, #96c93d)', borderRadius: '12px', padding: '12px', flexShrink: 0 }}>
              <Users size={26} color="white" />
            </div>
            <div>
              <div style={{ fontSize: '1.35rem', fontWeight: '800', marginBottom: '3px' }}>شاشة اللاعبين</div>
              <div style={{ fontSize: '0.9rem', color: '#999' }}>انضم إلى غرفة وألعب مع فريقك</div>
            </div>
          </button>
        </div>
      )}

      {(mode === 'admin-loading' || mode === 'player-connecting') && (
        <div style={{ textAlign: 'center', color: '#888', fontSize: '1.1rem', animation: 'fadeIn 0.5s' }}>
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
            <Download size={38} className="spin-animation" color="#00b09b" />
          </div>
          {mode === 'admin-loading' ? 'جاري إنشاء الغرفة...' : 'جاري الانضمام...'}
        </div>
      )}

      {mode === 'player-join' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', maxWidth: '360px', animation: 'fadeInUp 0.4s ease-out' }}>
          <h2 style={{ textAlign: 'center', fontSize: '1.5rem', margin: '0 0 6px', color: '#00b09b' }}>بيانات الانضمام</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '0.9rem', color: '#888' }}>رمز الغرفة (4 أحرف)</label>
            <input
              type="text" value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4))}
              placeholder="مثال: ABCD" maxLength={4}
              style={{
                padding: '14px 18px', borderRadius: '14px',
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                color: 'white', fontSize: '2rem', fontWeight: '900',
                textAlign: 'center', letterSpacing: '8px',
                fontFamily: "'Cairo', sans-serif", outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '0.9rem', color: '#888' }}>اسمك</label>
            <input
              type="text" value={playerName}
              onChange={(e) => setPlayerName(e.target.value.slice(0, 20))}
              placeholder="أدخل اسمك" maxLength={20}
              onKeyDown={(e) => e.key === 'Enter' && handlePlayerJoin()}
              style={{
                padding: '14px 18px', borderRadius: '14px',
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                color: 'white', fontSize: '1.25rem', fontWeight: '600',
                textAlign: 'right', fontFamily: "'Cairo', sans-serif", outline: 'none',
              }}
            />
          </div>

          <button
            onClick={handlePlayerJoin}
            style={{
              padding: '16px', background: 'linear-gradient(135deg, #00b09b, #96c93d)',
              border: 'none', borderRadius: '14px', color: 'white',
              fontSize: '1.25rem', fontWeight: '800', cursor: 'pointer',
              boxShadow: '0 8px 22px rgba(0,176,155,0.35)', marginTop: '4px',
            }}
          >
            انضم الآن ←
          </button>

          <button
            onClick={() => { setMode('select'); setError(null); setRoomCode(''); setPlayerName(''); }}
            style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', fontSize: '1rem', padding: '6px' }}
          >رجوع</button>
        </div>
      )}

      <style>{`
        @keyframes fadeInDown { from { opacity:0; transform:translateY(-25px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeInUp   { from { opacity:0; transform:translateY(25px);  } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn     { from { opacity:0; } to { opacity:1; } }
        @keyframes spin       { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        .spin-animation { animation: spin 1s linear infinite; }
        input:focus { border-color: rgba(0,176,155,0.55) !important; box-shadow: 0 0 0 3px rgba(0,176,155,0.12) !important; }
      `}</style>
    </div>
  );
};
