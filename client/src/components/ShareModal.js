import React, { useState } from 'react';
import { authFetch } from '../auth';
import { buildShareLink } from '../constants';
import { showToast } from './Toast';

export default function ShareModal({ itinerary, onClose, onShared }) {
  const [shareLink, setShareLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const plan = itinerary?.ai_generated || itinerary;
  const title = itinerary?.title || plan?.title || 'My trip';
  const destination = itinerary?.destination || plan?.destination || '';

  async function createLink() {
    setLoading(true);
    try {
      const res = await authFetch(`/api/itinerary/${itinerary._id}/share`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not create share link');
      const link =
        data.share_url ||
        buildShareLink(data.share_path || data.share_token);
      setShareLink(link);
      onShared?.();
      showToast('Share link ready');
    } catch (err) {
      showToast(err.message || 'Share failed', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      showToast('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Copy failed — select the link manually', 'error');
    }
  }

  function nativeShare() {
    if (!shareLink || !navigator.share) return;
    navigator.share({
      title: `Trip: ${title}`,
      text: destination ? `Check out my ${destination} itinerary on trrip` : 'Check out my travel itinerary',
      url: shareLink,
    }).catch(() => {});
  }

  const whatsappUrl = shareLink
    ? `https://wa.me/?text=${encodeURIComponent(`My trip plan: ${title}\n${shareLink}`)}`
    : null;

  const mailUrl = shareLink
    ? `mailto:?subject=${encodeURIComponent(`Trip plan: ${title}`)}&body=${encodeURIComponent(shareLink)}`
    : null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="share-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="share-title">
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        <div className="share-modal-hero">
          <span className="share-icon">🔗</span>
          <h3 id="share-title">Share your itinerary</h3>
          <p>Anyone with the link can view your weekly plan — no login required.</p>
        </div>

        <div className="share-preview-card">
          <strong>{title}</strong>
          {destination && <div className="muted">{destination}</div>}
        </div>

        {!shareLink ? (
          <button type="button" className="btn btn-block" onClick={createLink} disabled={loading}>
            {loading ? 'Creating secure link…' : 'Create share link'}
          </button>
        ) : (
          <>
            <label className="label">Your share link</label>
            <div className="share-link-row">
              <input readOnly value={shareLink} className="share-input" onFocus={(e) => e.target.select()} />
              <button type="button" className="btn" onClick={copyLink}>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="share-actions">
              {navigator.share && (
                <button type="button" className="btn secondary" onClick={nativeShare}>
                  Share…
                </button>
              )}
              {whatsappUrl && (
                <a className="btn secondary" href={whatsappUrl} target="_blank" rel="noreferrer">
                  WhatsApp
                </a>
              )}
              {mailUrl && (
                <a className="btn secondary" href={mailUrl}>
                  Email
                </a>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
