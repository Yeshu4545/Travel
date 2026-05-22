import React, { useState, useEffect, useRef } from 'react';
import Register from './Register';
import Login from './Login';
import { getAccessToken, clearTokens, authFetch } from './auth';

function App() {
  const [token, setToken] = useState(getAccessToken());
  const [itineraries, setItineraries] = useState([]);
  const [selectedItinerary, setSelectedItinerary] = useState(null);
  const [page, setPage] = useState((window.location.hash || '#login').replace('#', '') || 'login');

  useEffect(() => {
    if (token) fetchItineraries();
  }, [token]);

  useEffect(() => {
    const onHash = () => setPage((window.location.hash || '#login').replace('#', '') || 'login');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  async function fetchItineraries() {
    const res = await authFetch('/api/itinerary');
    const data = await res.json();
    setItineraries(data.itineraries || []);
  }

  function handleAuth(t) {
    setToken(t);
    fetchItineraries();
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
          <button className="btn secondary" onClick={() => { clearTokens(); setToken(null); }}>Sign out</button>
        </div>
      </div>

      <div className="container">
        <div className="panel">
          <h3 style={{marginTop:0, color:'var(--color-bg-deep-teal)'}}>Upload & Generate</h3>
          <Upload token={token} onUploaded={async (created) => { if (created) setSelectedItinerary(created); await fetchItineraries(); }} />

          <h3 style={{marginTop:18, color:'var(--color-bg-deep-teal)'}}>History</h3>
          <ul className="it-list">
            {itineraries.map(it => (
              <li key={it._id} className="it-row">
                <div>
                  <strong>{it.title || 'Untitled'}</strong>
                  <div className="muted">{new Date(it.createdAt).toLocaleString()}</div>
                </div>
                <div>
                  <button className="btn" onClick={async () => {
                    const res = await authFetch(`/api/itinerary/${it._id}`);
                    const data = await res.json();
                    setSelectedItinerary(data.itinerary);
                  }}>View</button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel">
          <h3 style={{marginTop:0, color:'var(--color-bg-deep-teal)'}}>Itinerary Viewer</h3>
          {!selectedItinerary ? <div style={{color:'rgba(45,58,56,0.7)'}}>Select an itinerary from history or generate one from uploads.</div> : <ItineraryViewer it={selectedItinerary} onClose={() => setSelectedItinerary(null)} />}
        </div>
      </div>
    </div>
  );
}

// Auth handled by separate Register and Login components

function Upload({ token, onUploaded }) {
  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [extractedResults, setExtractedResults] = useState(null);
  const [renderedItinerary, setRenderedItinerary] = useState(null);
  const [createdItinerary, setCreatedItinerary] = useState(null);
  const inputRef = useRef();

  function handleFiles(selected) {
    const arr = Array.from(selected);
    setFiles(prev => [...prev, ...arr].slice(0, 8));
  }

  function onInputChange(e) { handleFiles(e.target.files); }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer?.files) handleFiles(e.dataTransfer.files);
  }

  function removeFile(idx) {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  }

  async function upload(e) {
    e && e.preventDefault();
    if (!files.length) return;
    setUploading(true);
    const form = new FormData();
    files.forEach(f => form.append('files', f));
    try {
      const res = await authFetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        const err = data.error || data.message || JSON.stringify(data);
        setAiResult(`Error: ${err}`);
      } else {
        // show extracted text immediately
        const extracted = (data.itinerary && data.itinerary.bookings) || data.extracted || [];
        setExtractedResults(extracted);
        const aiText = data.ai || (data.itinerary && data.itinerary.ai_generated) || '';
        const rendered = data.rendered || (typeof aiText === 'string' ? aiText : JSON.stringify(aiText, null, 2));
        setAiResult(aiText || JSON.stringify(data.itinerary || {}, null, 2));
        setRenderedItinerary(rendered);
        setFiles([]);
        setCreatedItinerary(data.itinerary || null);
        onUploaded && onUploaded(data.itinerary || null);
      }
    } catch (err) {
      console.error(err);
      setAiResult(`Upload failed: ${err.message || err}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div
        className={`dropzone ${dragOver ? 'dragover' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current && inputRef.current.click()}
      >
        <input ref={inputRef} style={{ display: 'none' }} type="file" multiple onChange={onInputChange} />
        <p>Drag & drop files here, or click to select (PDFs / images)</p>
      </div>

      {files.length > 0 && (
        <div className="previews">
          {files.map((f, i) => (
            <div className="preview" key={i}>
              <div className="name">{f.name}</div>
              <button onClick={() => removeFile(i)}>Remove</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 10, display:'flex', gap:8 }}>
        <button className="btn" onClick={upload} disabled={uploading}>{uploading ? 'Uploading...' : 'Upload & Generate'}</button>
        <button className="btn secondary" onClick={() => { setFiles([]); setAiResult(null); setExtractedResults(null); setCreatedItinerary(null); }}>Clear</button>
        {createdItinerary && <button className="btn" onClick={() => onUploaded && onUploaded(createdItinerary)}>Open generated itinerary</button>}
      </div>

      {renderedItinerary && (
        <div className="ai-result">
          <h4>Planned Itinerary</h4>
          <pre style={{whiteSpace:'pre-wrap'}}>{renderedItinerary}</pre>
        </div>
      )}
      {extractedResults && (
        <div className="ai-result">
          <h4>Extracted Text (first lines)</h4>
          <ul>
            {extractedResults.map((e, i) => (
              <li key={i}><strong>{e.filename}</strong>: <span>{(e.text||'').substr(0,200)}{(e.text && e.text.length>200)?'...':''}</span></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;

function ItineraryViewer({ it, onClose }) {
  let parsed = null;
  const ai = it.ai_generated || it.ai || it.aiResult || '';
  if (ai) {
    if (typeof ai === 'object') parsed = ai;
    else {
      try { parsed = JSON.parse(ai); } catch (e) { parsed = null; }
    }
  }

  return (
    <div className="viewer">
      <div className="viewer-header">
        <h2>{it.title || 'Itinerary'}</h2>
        <div>
          <button onClick={onClose}>Close</button>
        </div>
      </div>

      <div className="viewer-body">
        {parsed ? (
          <div>
            {parsed.days && parsed.days.length ? parsed.days.map((day, idx) => (
              <div className="day" key={idx}>
                <div className="day-title">{day.date || `Day ${idx+1}`}</div>
                <div className="day-items">
                  {(day.items || []).map((itx, j) => (
                    <div className="item" key={j}>
                      <div className="item-time">{itx.time || ''}</div>
                      <div className="item-main">
                        <div className="item-type">{itx.type || itx.title || itx.name}</div>
                        <div className="item-details">{itx.from ? `${itx.from} → ${itx.to || ''}` : itx.details || ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )) : <div>No days found in AI output.</div>}

            {parsed.bookings && parsed.bookings.length > 0 && (
              <div>
                <h4>Bookings</h4>
                <ul>
                  {parsed.bookings.map((b, i) => <li key={i}>{typeof b === 'string' ? b : JSON.stringify(b)}</li>)}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div>
            <h4>AI Output (raw)</h4>
            <pre>{ai || it.ai_generated || it.ai_generated}</pre>
            {it.bookings && it.bookings.length > 0 && (
              <div>
                <h4>Uploaded Bookings</h4>
                <ul>
                  {it.bookings.map((b, i) => <li key={i}>{b.filename} — {b.text ? (b.text.substr(0,120) + (b.text.length>120?'...':'')) : 'no text'}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
