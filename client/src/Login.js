import React, { useState } from 'react';
import { apiUrl } from './constants';
import { handleAuthResponse } from './auth';
import { parseJsonResponse, getAuthErrorMessage } from './apiHelpers';
import AuthHero from './components/AuthHero';

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
      <AuthHero
        title="Simplifying on-ground travel experiences"
        subtitle="Manage tours, coordinate partners, and deliver smooth trip execution after confirmation."
        bullets={[
          'Upload tickets & hotel PDFs',
          'Gemini builds your weekly plan',
          'Share itineraries with one link',
        ]}
      />

      <div className="auth-card">
        <h2>Login Now</h2>
        <p className="muted">Sign in with your email and password</p>

        {error && <div className="auth-error">{error}</div>}

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

          <label className="label">Password</label>
          <input
            className="input"
            name="password"
            type="password"
            placeholder="Enter your password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />

          <button type="submit" className="btn primary" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>

          <div className="auth-footer">
            Don&apos;t have an account?{' '}
            <a href="#register" onClick={(e) => { e.preventDefault(); window.location.hash = 'register'; }}>Register Now</a>
          </div>
        </form>
      </div>
    </div>
  );
}
