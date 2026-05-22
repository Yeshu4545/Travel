import React, { useState, useEffect, useRef } from 'react';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [itineraries, setItineraries] = useState([]);

  useEffect(() => {
    if (token) fetchItineraries();
  }, [token]);

  async function fetchItineraries() {
    const res = await fetch('http://localhost:5000/api/itinerary', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setItineraries(data.itineraries || []);
  }

  if (!token) return <Auth onAuth={(t) => { setToken(t); localStorage.setItem('token', t); }} />;

  return (
    <div className="container">
      <h1>My Itineraries</h1>
      <Upload token={token} onUploaded={fetchItineraries} />
      <h3>History</h3>
      <ul className="it-list">
        {itineraries.map(it => (
          <li key={it._id} className="it-row">
            <div>
              <strong>{it.title || 'Untitled'}</strong>
              <div className="muted">{new Date(it.createdAt).toLocaleString()}</div>
            </div>
            <div>
              <button onClick={async () => {
                const res = await fetch(`http://localhost:5000/api/itinerary/${it._id}`, { headers: { Authorization: `Bearer ${token}` } });
                const data = await res.json();
                setSelectedItinerary(data.itinerary);
              }}>View</button>
            </div>
          </li>
        ))}
      </ul>

      {selectedItinerary && <ItineraryViewer it={selectedItinerary} onClose={() => setSelectedItinerary(null)} />}
    </div>
  );
}

function Auth({ onAuth }) {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  async function submit(e) {
    e.preventDefault();
    const url = `http://localhost:5000/api/auth/${isLogin ? 'login' : 'register'}`;
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const data = await res.json();
    if (data.token) onAuth(data.token);
  }

  return (
    <div className="auth">
      <h2>{isLogin ? 'Login' : 'Register'}</h2>
      <form onSubmit={submit}>
        {!isLogin && <input placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />}
        <input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        <input type="password" placeholder="Password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
        <button type="submit">Submit</button>
      </form>
      <button onClick={() => setIsLogin(!isLogin)}>{isLogin ? 'Switch to register' : 'Switch to login'}</button>
    </div>
  );
}

function Upload({ token, onUploaded }) {
  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
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
      const res = await fetch('http://localhost:5000/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
      const data = await res.json();
      setAiResult(data.ai || JSON.stringify(data.itinerary || data.extracted || {}, null, 2));
      setFiles([]);
      onUploaded && onUploaded();
    } catch (err) {
      console.error(err);
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

      <div style={{ marginTop: 10 }}>
        <button onClick={upload} disabled={uploading}>{uploading ? 'Uploading...' : 'Upload files'}</button>
      </div>

      {aiResult && (
        <div className="ai-result">
          <h4>AI Result</h4>
          <pre>{aiResult}</pre>
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
