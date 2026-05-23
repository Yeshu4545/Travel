import React from 'react';

export default function AuthHero({ title, subtitle, bullets }) {
  return (
    <div className="auth-hero">
      <div className="auth-hero-inner">
        <div className="auth-hero-badge">AI travel planning</div>
        <div className="logo large">trrip</div>
        <h1>{title}</h1>
        <p className="muted-hero">{subtitle}</p>
        {bullets?.length > 0 && (
          <ul className="auth-hero-list">
            {bullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
