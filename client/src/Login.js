import React, { useState } from 'react';

export default function Login({ onAuth }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [otpRequested, setOtpRequested] = useState(false);

  async function submit(e) {
    e && e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (res.ok && data.token) {
        onAuth && onAuth(data.token);
      } else {
        setError(data.error || data.message || 'Login failed');
      }
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-hero">
        <div className="auth-hero-inner">
          <div className="logo large">trrip</div>
          <h1>Simplifying on-ground travel experiences</h1>
          <p className="muted-hero">Manage on-ground experiences, coordinate partners, and ensure smooth trip execution after confirmation.</p>
        </div>
      </div>

      <div className="auth-card">
        <h2>Login Now</h2>
        <p className="muted">View and manage all tours and travellers in one place</p>

        {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}

        <form onSubmit={submit} className="auth-form">
          <label className="label">Email or Mobile Number</label>
          <input className="input" name="email" placeholder="user@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />

          {!showPassword ? (
            <>
              <button type="button" className="btn primary" style={{marginTop:12}} onClick={() => { setOtpRequested(true); }} disabled={!form.email}>Request for OTP</button>
              {otpRequested && <div style={{marginTop:8, color:'green'}}>OTP requested for {form.email} (simulation)</div>}

              <div className="or-sep">Or</div>
              <div style={{display:'flex', gap:8}}>
                <button type="button" className="btn secondary" onClick={() => setShowPassword(true)}>Login with Password</button>
                <button type="button" className="btn" onClick={() => { window.location.hash = 'register'; }}>Register</button>
              </div>
            </>
          ) : (
            <>
              <label className="label" style={{marginTop:10}}>Password</label>
              <input className="input" name="password" type="password" placeholder="Enter your password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />

              <button type="submit" className="btn primary" style={{marginTop:12}} disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
              <div style={{marginTop:10}}>
                <button type="button" className="btn secondary" onClick={() => { setShowPassword(false); }}>Back to OTP</button>
              </div>
            </>
          )}

          <div style={{marginTop:14, fontSize:13, textAlign:'center'}}>
            Don't have an account? <a href="#register" onClick={(e) => { e.preventDefault(); window.location.hash = 'register'; }}>Register Now</a>
          </div>
        </form>
      </div>
    </div>
  );
}
