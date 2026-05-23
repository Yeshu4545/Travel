import React, { useState, useEffect, useRef } from 'react';
import Register from './Register';
import Login from './Login';
import { getAccessToken, clearTokens, authFetch, authFetchJson } from './auth';
import { apiUrl } from './constants';

function App() {
  const [token, setToken] = useState(getAccessToken());
  const [itineraries, setItineraries] = useState([]);
  const [selectedItinerary, setSelectedItinerary] = useState(null);
  const [page, setPage] = useState((window.location.hash || '#login').replace('#', '') || 'login');
  const [sharedItinerary, setSharedItinerary] = useState(null);
  const [shareLoading, setShareLoading] = useState(false);

  useEffect(() => {
    if (token) fetchItineraries();
  }, [token]);

  useEffect(() => {
    const onHash = () => {
      const hash = window.location.hash || '#login';
      if (hash.startsWith('#share/')) {
        const shareToken = hash.replace('#share/', '');
        loadSharedItinerary(shareToken);
        setPage('share');
        return;
      }
      setSharedItinerary(null);
      setPage(hash.replace('#', '') || 'login');
    };
    window.addEventListener('hashchange', onHash);
    onHash();
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  async function loadSharedItinerary(shareToken) {
    setShareLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/itinerary/shared/${shareToken}`));
      const data = await res.json();
      if (res.ok) setSharedItinerary(data.itinerary);
      else setSharedItinerary(null);
    } catch {
      setSharedItinerary(null);
    } finally {
      setShareLoading(false);
    }
  }

  async function fetchItineraries() {
    const res = await authFetch('/api/itinerary');
    const data = await res.json();
    setItineraries(data.itineraries || []);
  }

  function handleAuth(t) {
    setToken(t);
    window.location.hash = '';
    setPage('');
    fetchItineraries();
  }

  if (page === 'share') {
    return (
      <div className="app-shell">
        <div className="panel" style={{ maxWidth: 720, margin: '0 auto' }}>
          <h2 style={{ marginTop: 0, color: 'var(--color-bg-deep-teal)' }}>Shared Itinerary</h2>
          {shareLoading && <p>Loading...</p>}
          {!shareLoading && !sharedItinerary && <p>This share link is invalid or expired.</p>}
          {sharedItinerary && <ItineraryViewer it={sharedItinerary} embedded />}
          <div style={{ marginTop: 16 }}>
            <a href="#login">Go to login</a>
          </div>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="app-shell">
        <div className="container">
          <div className="panel auth">
            {page === 'register' ? <Register onAuth={handleAuth} /> : <Login onAuth={handleAuth} />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="brand">
          <div className="logo">TI</div>
          <div className="title">Travel Itineraries</div>
        </div>
        <div>
          <button className="btn secondary" onClick={() => { clearTokens(); setToken(null); window.location.hash = 'login'; }}>
            Sign out
          </button>
        </div>
      </div>

      <div className="container">
        <div className="panel">
          <h3 style={{ marginTop: 0, color: 'var(--color-bg-deep-teal)' }}>Upload &amp; Generate</h3>
          <p style={{ fontSize: 13, marginTop: 0, opacity: 0.8 }}>
            Upload booking PDFs or images. We extract details, build a weekly plan with Gemini AI, and save it to MongoDB.
          </p>
          <Upload
            onUploaded={async (created) => {
              if (created) setSelectedItinerary(created);
              await fetchItineraries();
            }}
          />

          <h3 style={{ marginTop: 18, color: 'var(--color-bg-deep-teal)' }}>History</h3>
          {itineraries.length === 0 ? (
            <p className="muted">No itineraries yet. Upload documents to generate your first plan.</p>
          ) : (
            <ul className="it-list">
              {itineraries.map((it) => (
                <li key={it._id} className="it-row">
                  <div>
                    <strong>{it.title || 'Untitled'}</strong>
                    <div className="muted">
                      {it.destination && `${it.destination} · `}
                      {new Date(it.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <button
                      className="btn"
                      type="button"
                      onClick={async () => {
                        const res = await authFetch(`/api/itinerary/${it._id}`);
                        const data = await res.json();
                        setSelectedItinerary(data.itinerary);
                      }}
                    >
                      View
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel">
          <h3 style={{ marginTop: 0, color: 'var(--color-bg-deep-teal)' }}>Itinerary Viewer</h3>
          {!selectedItinerary ? (
            <div style={{ color: 'rgba(45,58,56,0.7)' }}>
              Select an itinerary from history or generate one from uploads.
            </div>
          ) : (
            <ItineraryViewer it={selectedItinerary} onClose={() => setSelectedItinerary(null)} onShared={fetchItineraries} />
          )}
        </div>
      </div>
    </div>
  );
}

function Upload({ onUploaded }) {
  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState(null);
  const [generated, setGenerated] = useState(null);
  const inputRef = useRef();

  function handleFiles(selected) {
    const arr = Array.from(selected);
    setFiles((prev) => [...prev, ...arr].slice(0, 8));
  }

  function onInputChange(e) {
    handleFiles(e.target.files);
    e.target.value = '';
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer?.files) handleFiles(e.dataTransfer.files);
  }

  function removeFile(idx) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function upload(e) {
    e?.preventDefault();
    if (!files.length) return;
    setUploading(true);
    setStatus(null);
    setGenerated(null);

    const form = new FormData();
    files.forEach((f) => form.append('files', f));

    try {
      const { res, data } = await authFetchJson('/api/itinerary/generate', { method: 'POST', body: form });

      if (!res.ok) {
        setStatus({ type: 'error', text: data.error || 'Generation failed' });
        return;
      }

      setGenerated(data.itinerary);
      setFiles([]);
      setStatus({ type: 'ok', text: data.message || 'Weekly itinerary saved to MongoDB' });
      onUploaded?.(data.itinerary);
    } catch (err) {
      setStatus({ type: 'error', text: err.message || 'Upload failed' });
    } finally {
      setUploading(false);
    }
  }

  const plan = generated?.ai_generated || generated?.weeklyPlan ? generated?.ai_generated : null;

  return (
    <div>
      <div
        className={`dropzone ${dragOver ? 'dragover' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <input ref={inputRef} style={{ display: 'none' }} type="file" accept=".pdf,image/*" multiple onChange={onInputChange} />
        <p>Drag &amp; drop PDFs or images, or click to select</p>
      </div>

      {files.length > 0 && (
        <div className="previews">
          {files.map((f, i) => (
            <div className="preview" key={i}>
              <div className="name">{f.name}</div>
              <button type="button" onClick={(ev) => { ev.stopPropagation(); removeFile(i); }}>Remove</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn" type="button" onClick={upload} disabled={uploading || !files.length}>
          {uploading ? 'Extracting & generating plan...' : 'Upload & Generate'}
        </button>
        <button
          className="btn secondary"
          type="button"
          onClick={() => { setFiles([]); setStatus(null); setGenerated(null); }}
        >
          Clear
        </button>
      </div>

      {status && <div className={`status-msg ${status.type === 'error' ? 'error' : ''}`}>{status.text}</div>}

      {generated && (
        <div className="ai-result" style={{ marginTop: 14 }}>
          <h4>Generated weekly plan</h4>
          <ItineraryPlan plan={plan || { weeklyPlan: generated.weeklyPlan, title: generated.title, destination: generated.destination, summary: generated.summary, tripStart: generated.tripStart, tripEnd: generated.tripEnd }} compact />
        </div>
      )}
    </div>
  );
}

function ItineraryPlan({ plan, compact }) {
  if (!plan) return null;
  const days = plan.weeklyPlan || plan.days || [];

  return (
    <div>
      {!compact && plan.summary && <div className="plan-summary">{plan.summary}</div>}
      <div className="plan-meta">
        {plan.destination && <div><strong>Destination:</strong> {plan.destination}</div>}
        {(plan.tripStart || plan.tripEnd) && (
          <div><strong>Dates:</strong> {plan.tripStart || '?'} → {plan.tripEnd || '?'}</div>
        )}
      </div>
      {days.map((day, idx) => (
        <div className="day" key={idx}>
          <div className="day-title">
            {day.dayLabel || `Day ${day.day || idx + 1}`}
            {day.date ? ` · ${day.date}` : ''}
          </div>
          {day.theme && <div style={{ fontSize: 13, marginBottom: 8, fontStyle: 'italic' }}>{day.theme}</div>}
          {(day.activities || day.items || []).map((act, j) => (
            <div className="activity-card" key={j}>
              <div className="item-time">{act.time || ''}</div>
              <div className="item-main">
                <div className="item-type">{act.title || act.type}</div>
                {act.location && <div className="item-details">📍 {act.location}</div>}
                <div className="item-details">{act.description || act.details || ''}</div>
                {act.type && act.title && <div className="activity-type">{act.type}</div>}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ItineraryViewer({ it, onClose, onShared, embedded }) {
  const [shareLink, setShareLink] = useState('');
  const [sharing, setSharing] = useState(false);

  const plan = it.ai_generated || {
    title: it.title,
    destination: it.destination,
    summary: it.summary,
    tripStart: it.tripStart,
    tripEnd: it.tripEnd,
    weeklyPlan: it.weeklyPlan,
    bookingsSummary: it.bookingsSummary,
  };

  async function share() {
    setSharing(true);
    try {
      const res = await authFetch(`/api/itinerary/${it._id}/share`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        const link = `${window.location.origin}${window.location.pathname}${data.share_path || `#share/${data.share_token}`}`;
        setShareLink(link);
        onShared?.();
      }
    } finally {
      setSharing(false);
    }
  }

  function copyLink() {
    if (shareLink) navigator.clipboard?.writeText(shareLink);
  }

  const wrapperClass = embedded ? '' : 'viewer';

  return (
    <div className={wrapperClass}>
      <div className="viewer-header">
        <h2>{it.title || plan.title || 'Itinerary'}</h2>
        {!embedded && onClose && <button type="button" onClick={onClose}>Close</button>}
      </div>

      <div className="viewer-body">
        <ItineraryPlan plan={plan} />

        {plan.bookingsSummary?.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <h4>From your uploads</h4>
            <ul>
              {plan.bookingsSummary.map((b, i) => (
                <li key={i}><strong>{b.type}</strong> ({b.source}): {b.details}</li>
              ))}
            </ul>
          </div>
        )}

        {!embedded && (
          <div className="share-box">
            <strong>Share this itinerary</strong>
            <button className="btn" type="button" style={{ marginTop: 8 }} onClick={share} disabled={sharing}>
              {sharing ? 'Creating link...' : 'Generate share link'}
            </button>
            {shareLink && (
              <>
                <input readOnly value={shareLink} onFocus={(e) => e.target.select()} />
                <button className="btn secondary" type="button" style={{ marginTop: 6 }} onClick={copyLink}>
                  Copy link
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
