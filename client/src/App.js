import React, { useState, useEffect } from 'react';
import Register from './Register';
import Login from './Login';
import { getAccessToken, clearTokens, authFetch } from './auth';
import { apiUrl } from './constants';
import ToastContainer from './components/Toast';
import UploadZone from './components/UploadZone';
import ItineraryPlan from './components/ItineraryPlan';
import ShareModal from './components/ShareModal';

function App() {
  const [token, setToken] = useState(getAccessToken());
  const [itineraries, setItineraries] = useState([]);
  const [selectedItinerary, setSelectedItinerary] = useState(null);
  const [shareModalIt, setShareModalIt] = useState(null);
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
        loadSharedItinerary(hash.replace('#share/', ''));
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
      setSharedItinerary(res.ok ? data.itinerary : null);
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
      <>
        <ToastContainer />
        <SharedPage itinerary={sharedItinerary} loading={shareLoading} />
      </>
    );
  }

  if (!token) {
    return (
      <div className="auth-shell">
        <ToastContainer />
        {page === 'register' ? <Register onAuth={handleAuth} /> : <Login onAuth={handleAuth} />}
      </div>
    );
  }

  return (
    <div className="app-shell">
      <ToastContainer />
      <header className="topbar">
        <div className="brand">
          <div className="logo">trrip</div>
          <div>
            <div className="title">Travel Itineraries</div>
            <div className="subtitle">AI-powered weekly trip plans</div>
          </div>
        </div>
        <button
          type="button"
          className="btn secondary topbar-btn"
          onClick={() => { clearTokens(); setToken(null); window.location.hash = 'login'; }}
        >
          Sign out
        </button>
      </header>

      <main className="dashboard">
        <section className="panel panel-upload">
          <div className="panel-head">
            <h2>Upload & Generate</h2>
            <p>Gemini reads your bookings and builds a day-by-day plan, saved to MongoDB.</p>
          </div>
          <UploadZone
            onUploaded={(created) => {
              if (created) setSelectedItinerary(created);
              fetchItineraries();
            }}
          />
        </section>

        <section className="panel panel-side">
          <div className="panel-head">
            <h2>Your trips</h2>
            <span className="badge">{itineraries.length}</span>
          </div>
          {itineraries.length === 0 ? (
            <p className="empty-state">No itineraries yet. Upload a ticket or hotel PDF to get started.</p>
          ) : (
            <ul className="trip-cards">
              {itineraries.map((it) => (
                <li
                  key={it._id}
                  className={`trip-card ${selectedItinerary?._id === it._id ? 'active' : ''}`}
                >
                  <button type="button" className="trip-card-main" onClick={async () => {
                    const res = await authFetch(`/api/itinerary/${it._id}`);
                    const data = await res.json();
                    setSelectedItinerary(data.itinerary);
                  }}>
                    <span className="trip-card-title">{it.title || 'Untitled trip'}</span>
                    <span className="trip-card-meta">
                      {it.destination && `${it.destination} · `}
                      {new Date(it.createdAt).toLocaleDateString()}
                    </span>
                  </button>
                  <div className="trip-card-actions">
                    {it.shared && <span className="shared-pill">Shared</span>}
                    <button type="button" className="btn-icon" title="Share" onClick={() => setShareModalIt(it)}>🔗</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel panel-viewer">
          <div className="panel-head">
            <h2>{selectedItinerary ? selectedItinerary.title || 'Itinerary' : 'Trip details'}</h2>
            {selectedItinerary && (
              <div className="panel-head-actions">
                <button type="button" className="btn secondary panel-btn" onClick={() => setShareModalIt(selectedItinerary)}>
                  Share trip
                </button>
                <button type="button" className="btn-icon" onClick={() => setSelectedItinerary(null)} aria-label="Close">×</button>
              </div>
            )}
          </div>
          {!selectedItinerary ? (
            <div className="empty-viewer">
              <span className="empty-icon">🗺️</span>
              <p>Select a trip from the list or generate a new one.</p>
            </div>
          ) : (
            <ItineraryViewerBody itinerary={selectedItinerary} />
          )}
        </section>
      </main>

      {shareModalIt && (
        <ShareModal
          itinerary={shareModalIt}
          onClose={() => setShareModalIt(null)}
          onShared={fetchItineraries}
        />
      )}
    </div>
  );
}

function ItineraryViewerBody({ itinerary }) {
  const plan = itinerary.ai_generated || itinerary;
  return (
    <div className="viewer-inline">
      <ItineraryPlan plan={plan} />
      {plan.bookingsSummary?.length > 0 && (
        <div className="bookings-block">
          <h4>From your documents</h4>
          <ul>
            {plan.bookingsSummary.map((b, i) => (
              <li key={i}><strong>{b.type}</strong> · {b.source}: {b.details}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SharedPage({ itinerary, loading }) {
  const plan = itinerary?.ai_generated || itinerary;

  return (
    <div className="share-page">
      <header className="share-page-header">
        <div className="logo large">trrip</div>
        <p className="share-page-tag">Shared itinerary</p>
      </header>
      <div className="share-page-card panel">
        {loading && <p className="loading-text">Loading trip…</p>}
        {!loading && !itinerary && (
          <div className="empty-state">
            <span className="empty-icon">🔒</span>
            <p>This link is invalid or the trip is no longer shared.</p>
            <a href="#login" className="btn">Create your own plan</a>
          </div>
        )}
        {!loading && itinerary && (
          <>
            <h1>{itinerary.title || 'Travel plan'}</h1>
            {itinerary.destination && <p className="share-destination">{itinerary.destination}</p>}
            <ItineraryPlan plan={plan} />
            <div className="share-cta">
              <p>Planning your own trip?</p>
              <a href="#register" className="btn">Get started free</a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
