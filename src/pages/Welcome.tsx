import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, Download } from 'lucide-react';
import { fetchAllQuestions } from '../services/questions';
import { generateRoomCode, useRoomStore } from '../store/roomStore';
import type { PlayerPresence } from '../store/roomStore';
import { subscribeToRoom } from '../services/realtime';
import { supabase } from '../lib/supabase';

type Mode = 'select' | 'admin-passcode' | 'admin-loading' | 'player-join' | 'player-connecting';

export const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('select');
  const [isLoaded, setIsLoaded] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    fetchAllQuestions().then(success => { if (success) setIsLoaded(true); });
  }, []);

  const handleAdminClick = () => {
    setMode('admin-passcode');
    setError(null);
  };

  const handleAdminPasscode = async () => {
    if (!passcode.trim()) { setError('يرجى إدخال رمز المدير'); return; }
    
    setMode('admin-loading');
    setError(null);

    try {
      // 1. Validate Passcode against Supabase
      const { data, error: dbError } = await supabase
        .from('admin_passcodes')
        .select('*')
        .eq('code', passcode.trim())
        .single();

      if (dbError || !data) {
        throw new Error('رمز غير صحيح');
      }

      // 2. Check Time Validity
      const now = new Date();
      const start = new Date(data.start_date);
      const end = new Date(data.end_date);

      if (now < start || now > end) {
        throw new Error('الرمز منتهي الصلاحية أو غير مفعل بعد');
      }

      // 3. If Valid, Proceed to Create Room
      const code = generateRoomCode();
      const clientId = useRoomStore.getState().clientId;
      const presence: PlayerPresence = { clientId, name: 'Admin', team: 'none', isAdmin: true };

      useRoomStore.setState({ roomCode: code, isAdmin: true, myName: 'Admin' });
      await subscribeToRoom(code, presence);
      navigate('/lobby-admin');
      
    } catch (err: any) {
      setError(err.message || 'فشل التحقق من الرمز. حاول مرة أخرى.');
      setMode('admin-passcode');
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
      background: 'var(--bg-main)',
      color: 'var(--text-primary)', padding: '20px', overflow: 'hidden',
      fontFamily: "'Cairo', sans-serif", direction: 'rtl',
    }}>
      {/* SVG Filter for Background Removal */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <filter id="remove-black">
          {/* This filter makes pixels with 0 luminance (black) transparent */}
          <feColorMatrix type="matrix" values="1 0 0 0 0
                                               0 1 0 0 0
                                               0 0 1 0 0
                                               1 1 1 0 -0.1" />
        </filter>
      </svg>

      {/* Logo */}
      <div style={{ marginBottom: '28px', animation: 'fadeInDown 0.8s ease-out' }}>
        <img src="./logo.png" alt="الحروف ثنائية" style={{
          width: '160px', height: 'auto', objectFit: 'contain',
          filter: 'drop-shadow(0 15px 35px rgba(0, 176, 155, 0.35))',
          mixBlendMode: 'screen'
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '380px', animation: 'fadeInUp 0.8s ease-out' }}>
          {/* Admin Card */}
          <button
            onClick={handleAdminClick}
            disabled={!isLoaded}
            style={{
              display: 'flex', alignItems: 'center', gap: '20px', padding: '24px',
              background: isLoaded ? 'white' : '#f1f3f5',
              border: isLoaded ? '1px solid var(--glass-border)' : '1px solid #eee',
              borderRadius: '24px', color: isLoaded ? 'var(--text-primary)' : '#ccc',
              cursor: isLoaded ? 'pointer' : 'not-allowed', textAlign: 'right',
              transition: 'all 0.3s', boxShadow: isLoaded ? 'var(--shadow-sm)' : 'none',
              position: 'relative', overflow: 'hidden'
            }}
            onMouseOver={(e) => { if (!isLoaded) return; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
          >
            <div style={{ background: 'linear-gradient(135deg, #ff416c, #ff4b2b)', borderRadius: '16px', padding: '14px', flexShrink: 0, boxShadow: '0 8px 16px rgba(255,65,108,0.2)' }}>
              <Shield size={28} color="white" />
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: '900', marginBottom: '4px' }}>شاشة المدير</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '700' }}>أنشئ غرفة جديدة وأدِر المباراة</div>
            </div>
          </button>

          {/* Player Card */}
          <button
            onClick={() => { setMode('player-join'); setError(null); }}
            disabled={!isLoaded}
            style={{
              display: 'flex', alignItems: 'center', gap: '20px', padding: '24px',
              background: isLoaded ? 'white' : '#f1f3f5',
              border: isLoaded ? '1px solid var(--glass-border)' : '1px solid #eee',
              borderRadius: '24px', color: isLoaded ? 'var(--text-primary)' : '#ccc',
              cursor: isLoaded ? 'pointer' : 'not-allowed', textAlign: 'right',
              transition: 'all 0.3s', boxShadow: isLoaded ? 'var(--shadow-sm)' : 'none',
            }}
            onMouseOver={(e) => { if (!isLoaded) return; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
          >
            <div style={{ background: 'linear-gradient(135deg, #00b09b, #96c93d)', borderRadius: '16px', padding: '14px', flexShrink: 0, boxShadow: '0 8px 16px rgba(0,176,155,0.2)' }}>
              <Users size={28} color="white" />
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: '900', marginBottom: '4px' }}>شاشة اللاعبين</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '700' }}>انضم إلى غرفة وألعب مع فريقك</div>
            </div>
          </button>
        </div>
      )}

      {mode === 'admin-passcode' && (
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '380px', animation: 'fadeInUp 0.4s ease-out', padding: '32px', borderRadius: '32px' }}>
          <h2 style={{ textAlign: 'center', fontSize: '1.6rem', fontWeight: '950', margin: '0 0 4px', color: 'var(--team1)' }}>رمز المدير</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: '800' }}>أدخل رمز تفعيل اللعبة</label>
            <input
              type="password" value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="••••"
              onKeyDown={(e) => e.key === 'Enter' && handleAdminPasscode()}
              style={{
                padding: '18px 20px', borderRadius: '18px',
                background: '#f8f9fa', border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)', fontSize: '1.6rem', fontWeight: '900',
                textAlign: 'center', letterSpacing: '6px',
                fontFamily: "'Cairo', sans-serif", outline: 'none',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
              }}
              autoFocus
            />
          </div>

          <button
            onClick={handleAdminPasscode}
            style={{
              padding: '18px', background: 'linear-gradient(135deg, #1e2030, #14161f)',
              border: 'none', borderRadius: '18px', color: 'white',
              fontSize: '1.3rem', fontWeight: '900', cursor: 'pointer',
              boxShadow: '0 10px 24px rgba(0,0,0,0.15)', marginTop: '8px',
            }}
          >
            تفعيل وإنشاء غرفة ←
          </button>

          <button
            onClick={() => { setMode('select'); setError(null); setPasscode(''); }}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1rem', fontWeight: '800', padding: '10px' }}
          >رجوع للرئيسية</button>
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
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '380px', animation: 'fadeInUp 0.4s ease-out', padding: '32px', borderRadius: '32px' }}>
          <h2 style={{ textAlign: 'center', fontSize: '1.6rem', fontWeight: '950', margin: '0 0 4px', color: 'var(--team2)' }}>بيانات الانضمام</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: '800' }}>رمز الغرفة (4 أحرف)</label>
            <input
              type="text" value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4))}
              placeholder="ABCD" maxLength={4}
              style={{
                padding: '16px 20px', borderRadius: '18px',
                background: '#f8f9fa', border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)', fontSize: '2rem', fontWeight: '950',
                textAlign: 'center', letterSpacing: '8px',
                fontFamily: "'Cairo', sans-serif", outline: 'none',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: '800' }}>اسمك بالكامل</label>
            <input
              type="text" value={playerName}
              onChange={(e) => setPlayerName(e.target.value.slice(0, 20))}
              placeholder="أدخل اسمك هنا..." maxLength={20}
              onKeyDown={(e) => e.key === 'Enter' && handlePlayerJoin()}
              style={{
                padding: '16px 20px', borderRadius: '18px',
                background: '#f8f9fa', border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: '800',
                textAlign: 'right', fontFamily: "'Cairo', sans-serif", outline: 'none',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
              }}
            />
          </div>

          <button
            onClick={handlePlayerJoin}
            style={{
              padding: '18px', background: 'linear-gradient(135deg, #00b09b, #96c93d)',
              border: 'none', borderRadius: '18px', color: 'white',
              fontSize: '1.3rem', fontWeight: '900', cursor: 'pointer',
              boxShadow: '0 10px 24px rgba(0,176,155,0.25)', marginTop: '8px',
            }}
          >
            انضم الآن ←
          </button>

          <button
            onClick={() => { setMode('select'); setError(null); setRoomCode(''); setPlayerName(''); }}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1rem', fontWeight: '800', padding: '10px' }}
          >رجوع للرئيسية</button>
        </div>
      )}

      {/* Credits */}
      <div style={{
        marginTop: '32px', padding: '12px 20px', borderRadius: '15px',
        background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)',
        textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)',
        display: 'flex', flexDirection: 'column', gap: '2px', animation: 'fadeIn 1.2s'
      }}>
        <div style={{ fontWeight: '800', opacity: 0.6 }}>Created by:</div>
        <div style={{ fontWeight: '950', color: 'var(--text-primary)' }}>thamerex@outlook.com</div>
      </div>

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
