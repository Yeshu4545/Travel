import React, { useState } from 'react';
import { apiUrl } from './constants';
import { handleAuthResponse } from './auth';
import { parseJsonResponse, getAuthErrorMessage } from './apiHelpers';

export default function Register({ onAuth }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function submit(e) {
    e && e.preventDefault();
    setError(null);

    const email = form.email.trim().toLowerCase();
    if (!form.name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    if (!form.password || form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    let res;
    let data = {};
    try {
      res = await fetch(apiUrl('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email,
          password: form.password,
        }),
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
          <h1>Grow Your\nBusiness</h1>
          <p className="muted-hero">Join thousands of agents delivering seamless tour experiences.</p>
        </div>
      </div>

      <div className="auth-card">
        <h2>Get Started</h2>
        <p className="muted">Create your agent account with email</p>

        {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}

        <form onSubmit={submit} className="auth-form">
          <label className="label">Full Name</label>
          <input
            className="input"
            placeholder="Your name"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
          />

          <label className="label" style={{ marginTop: 12 }}>Email</label>
          <input
            className="input"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
          />

          <label className="label" style={{ marginTop: 12 }}>Password</label>
          <input
            className="input"
            type="password"
            placeholder="At least 6 characters"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
          />

          <label className="label" style={{ marginTop: 12 }}>Confirm Password</label>
          <input
            className="input"
            type="password"
            placeholder="Re-enter password"
            value={form.confirmPassword}
            onChange={(e) => update('confirmPassword', e.target.value)}
          />

          <button className="btn primary" style={{ marginTop: 18 }} disabled={loading}>
            {loading ? 'Creating account...' : 'Register'}
          </button>

          <div style={{ marginTop: 18, textAlign: 'center', fontSize: 13 }}>
            Already have an account?{' '}
            <a href="#login" onClick={(e) => { e.preventDefault(); window.location.hash = 'login'; }}>Login</a>
          </div>
        </form>
      </div>
    </div>
  );
}
