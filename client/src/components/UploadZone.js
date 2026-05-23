import React, { useRef, useState } from 'react';
import { authFetchJson } from '../auth';
import { showToast } from './Toast';
import ItineraryPlan from './ItineraryPlan';

export default function UploadZone({ onUploaded }) {
  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generated, setGenerated] = useState(null);
  const inputRef = useRef();

  function handleFiles(selected) {
    setFiles((prev) => [...prev, ...Array.from(selected)].slice(0, 8));
  }

  async function upload() {
    if (!files.length) return;
    setUploading(true);
    setGenerated(null);
    const form = new FormData();
    files.forEach((f) => form.append('files', f));

    try {
      const { res, data } = await authFetchJson('/api/itinerary/generate', { method: 'POST', body: form });
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setGenerated(data.itinerary);
      setFiles([]);
      showToast('Itinerary saved to your history');
      onUploaded?.(data.itinerary);
    } catch (err) {
      showToast(err.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  }

  const plan = generated?.ai_generated || generated;

  return (
    <div className="upload-zone-wrap">
      <div
        className={`dropzone ${dragOver ? 'dragover' : ''} ${uploading ? 'uploading' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer?.files) handleFiles(e.dataTransfer.files); }}
        onClick={() => !uploading && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept=".pdf,image/*" multiple hidden onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }} />
        <div className="dropzone-icon">📄</div>
        <p className="dropzone-title">{dragOver ? 'Drop files here' : 'Drag & drop booking PDFs or images'}</p>
        <p className="dropzone-hint">or click to browse · up to 8 files</p>
      </div>

      {files.length > 0 && (
        <ul className="file-list">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`}>
              <span className="file-icon">{f.type?.includes('pdf') ? 'PDF' : '🖼'}</span>
              <span className="file-name">{f.name}</span>
              <button type="button" className="file-remove" onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}>×</button>
            </li>
          ))}
        </ul>
      )}

      <div className="upload-actions">
        <button type="button" className="btn" onClick={upload} disabled={uploading || !files.length}>
          {uploading ? (
            <span className="btn-loading"><span className="spinner" /> Generating plan…</span>
          ) : (
            'Upload & Generate'
          )}
        </button>
        <button type="button" className="btn secondary panel-btn" onClick={() => { setFiles([]); setGenerated(null); }} disabled={uploading}>
          Clear
        </button>
      </div>

      {generated && (
        <div className="ai-result">
          <h4>✨ Latest plan</h4>
          <ItineraryPlan plan={plan} compact />
        </div>
      )}
    </div>
  );
}
