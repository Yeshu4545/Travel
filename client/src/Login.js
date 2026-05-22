import React, { useState } from 'react';
import { apiUrl } from './constants';
import { handleAuthResponse } from './auth';
import { parseJsonResponse, getAuthErrorMessage } from './apiHelpers';

export default function Login({ onAuth }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e && e.preventDefault();
    setError(null);

    const email = form.email.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    if (!form.password) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    let res;
    let data = {};
    try {
      res = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: form.password }),
      });
      data = await parseJsonResponse(res);

      if (res.ok && (data.accessToken || data.token)) {
        handleAuthResponse(data, onAuth);
        return;
      }

      setError(getAuthErrorMessage(null, data, res));
    } catch (err) {
      setError(getAuthErrorMessage(err, data, res));
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
        <p className="muted">Sign in with your email and password</p>

        {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}

        <form onSubmit={submit} className="auth-form">
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            name="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />

          <label className="label" style={{ marginTop: 10 }}>Password</label>
          <input
            className="input"
            name="password"
            type="password"
            placeholder="Enter your password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />

          <button type="submit" className="btn primary" style={{ marginTop: 12 }} disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>

          <div style={{ marginTop: 14, fontSize: 13, textAlign: 'center' }}>
            Don&apos;t have an account?{' '}
            <a href="#register" onClick={(e) => { e.preventDefault(); window.location.hash = 'register'; }}>Register Now</a>
          </div>
        </form>
      </div>
    </div>
  );
}
