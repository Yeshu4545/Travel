import React, { useState } from 'react';

export default function Register({ onAuth }) {
  const [phone, setPhone] = useState('9876543210');
  const [countryCode] = useState('+91');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  async function sendCode(e) {
    e && e.preventDefault();
    setError(null);
    if (!phone || phone.length < 8) {
      setError('Please enter a valid phone number');
      return;
    }
    setSending(true);
    try {
      const base = (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL.length) ? process.env.REACT_APP_API_URL : '';
      const res = await fetch(`${base}/api/auth/send-otp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, countryCode }) });
      const contentType = res.headers.get('content-type') || '';
      let data;
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(`Unexpected response: ${text}`);
      }
      if (!res.ok) throw new Error(data.error || 'Failed to send');
      setSent(true);
      if (data.devCode) setCode(data.devCode);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSending(false);
    }
  }

  async function verifyCode(e) {
    e && e.preventDefault();
    setError(null);
    if (!code || code.length < 4) { setError('Enter the 6-digit code'); return; }
    setVerifying(true);
    try {
      const base = (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL.length) ? process.env.REACT_APP_API_URL : '';
      const res = await fetch(`${base}/api/auth/verify-otp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, countryCode, code }) });
      const contentType = res.headers.get('content-type') || '';
      let data;
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(`Unexpected response: ${text}`);
      }
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      if (data.token) {
        onAuth && onAuth(data.token);
      }
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-hero">
        <div className="auth-hero-inner">
          <div className="logo large">trrip</div>
          <h1>Grow Your\nBusiness</h1>
          <p className="muted-hero">Join thousands of agents delivering seamless tour experiences.</p>
        </div>
      </div>

      <div className="auth-card">
        <h2>Get Started</h2>
        <p className="muted">Verify your phone to register as an agent</p>

        {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}

        <form onSubmit={sendCode} className="auth-form">
          <label className="label">Phone Number</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ minWidth:72, background:'#fff', borderRadius:8, padding:'12px 10px', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:'var(--color-btn-teal)' }}>{countryCode}</div>
            <input className="input" style={{ flex:1 }} placeholder="9876543210" value={phone} onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))} />
          </div>


          {!sent ? (
            <>
              <button className="btn primary" style={{ marginTop:18 }} disabled={sending}>{sending ? 'Sending...' : 'Send Verification Code'}</button>
            </>
          ) : (
            <>
              <div style={{ marginTop:12 }}>Enter the verification code sent to <strong>{countryCode} {phone}</strong></div>
              <input className="input" style={{ marginTop:8 }} placeholder="123456" value={code} onChange={e => setCode(e.target.value.replace(/[^0-9]/g, ''))} />
              <div style={{ display:'flex', gap:8, marginTop:10 }}>
                <button className="btn primary" onClick={verifyCode} disabled={verifying}>{verifying ? 'Verifying...' : 'Verify & Register'}</button>
                <button className="btn secondary" onClick={() => { setSent(false); setCode(''); }}>Use different number</button>
              </div>
            </>
          )}

          <div style={{ marginTop:18, textAlign:'center', fontSize:13 }}>
            Already have an account? <a href="#login" onClick={(e) => { e.preventDefault(); window.location.hash = 'login'; }}>Login</a>
          </div>
        </form>
      </div>
    </div>
  );
}
