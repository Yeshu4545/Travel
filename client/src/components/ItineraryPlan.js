import React from 'react';

export default function ItineraryPlan({ plan, compact }) {
  if (!plan) return null;
  const days = plan.weeklyPlan || plan.days || [];

  return (
    <div className="itinerary-plan">
      {!compact && plan.summary && <div className="plan-summary">{plan.summary}</div>}
      <div className="plan-meta">
        {plan.destination && (
          <span className="meta-chip">📍 {plan.destination}</span>
        )}
        {(plan.tripStart || plan.tripEnd) && (
          <span className="meta-chip">
            📅 {plan.tripStart || '?'} → {plan.tripEnd || '?'}
          </span>
        )}
      </div>
      <div className="days-grid">
        {days.map((day, idx) => (
          <div className="day" key={idx}>
            <div className="day-title">
              {day.dayLabel || `Day ${day.day || idx + 1}`}
              {day.date ? <span className="day-date">{day.date}</span> : null}
            </div>
            {day.theme && <div className="day-theme">{day.theme}</div>}
            {(day.activities || day.items || []).map((act, j) => (
              <div className="activity-card" key={j}>
                <div className="item-time">{act.time || '—'}</div>
                <div className="item-main">
                  <div className="item-type">{act.title || act.type}</div>
                  {act.location && <div className="item-details">📍 {act.location}</div>}
                  {(act.description || act.details) && (
                    <div className="item-details">{act.description || act.details}</div>
                  )}
                  {act.type && act.title && <span className="activity-type">{act.type}</span>}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
