import React, { useState, useEffect } from 'react';
import LibraryGrid from './components/LibraryGrid';
import Player from './components/Player';
import StreamingServices from './components/StreamingServices';
import AmbientPlayer from './components/AmbientPlayer';
import UploadModal from './components/UploadModal';
import FeatureRequest from './components/FeatureRequest';
import api from './services/api';
import { handleOAuthCallback, saveTokens } from './hooks/useOAuth';

function App() {
  const [tracks, setTracks]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [showServices, setShowServices] = useState(false);
  const [showUpload, setShowUpload]     = useState(false);
  const [oauthStatus, setOauthStatus]   = useState(null); // null | 'success' | 'error'
  const [oauthMsg, setOauthMsg]         = useState('');

  // ── Handle OAuth callback redirect ──────────────────────────────────────────
  useEffect(() => {
    const params  = new URLSearchParams(window.location.search);
    const code    = params.get('code');
    const state   = params.get('state');
    const svcId   = localStorage.getItem('pt_last_oauth_svc');

    if (code && svcId) {
      handleOAuthCallback(code, state, svcId)
        .then(() => {
          setOauthStatus('success');
          setOauthMsg(`✅ Connected to ${svcId}!`);
          localStorage.removeItem('pt_last_oauth_svc');
          // Clean URL without reload
          window.history.replaceState({}, '', window.location.pathname);
          // Show services modal so user can see connected state
          setShowServices(true);
        })
        .catch(err => {
          setOauthStatus('error');
          setOauthMsg(`OAuth error: ${err.message}`);
          window.history.replaceState({}, '', window.location.pathname);
        });
    }
  }, []);

  // ── Load library ─────────────────────────────────────────────────────────────
  useEffect(() => {
    loadLibrary();
  }, []);

  const loadLibrary = async () => {
    setLoading(true);
    try {
      const res = await api.get('/library');
      setTracks(res.data);
    } catch (error) {
      console.error('Failed to load library', error);
    } finally {
      setLoading(false);
    }
  };

  const isEmpty     = !loading && tracks.length === 0;
  const showAmbient = isEmpty && !currentTrack;

  const handleDeleteTrack = async (id) => {
    try {
      await api.delete(`/tracks/${id}`);
      setTracks(tracks.filter(t => t.id !== id));
      if (currentTrack?.id === id) {
        setCurrentTrack(null);
      }
    } catch (error) {
      console.error('Failed to delete track', error);
      alert('Failed to delete track');
    }
  };

  return (
    <div className="app-shell">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-logo">
          <span className="logo-emoji">💩</span>
          <span className="logo-text">PoopTunes</span>
        </div>

        <nav className="header-nav">
          <button className="nav-btn active" aria-label="Library">🎵</button>
          <button
            className="nav-btn upload-btn"
            onClick={() => setShowUpload(true)}
            aria-label="Upload"
          >
            ⬆️
          </button>
        </nav>
      </header>

      {/* ── OAuth toast ── */}
      {oauthStatus && (
        <div className={`oauth-toast ${oauthStatus === 'success' ? 'toast-ok' : 'toast-err'}`}>
          {oauthMsg}
          <button className="toast-dismiss" onClick={() => setOauthStatus(null)}>✕</button>
        </div>
      )}

      {/* ── Main ── */}
      <main className="app-main">
        <div className="section-heading">
          <h2>Your Library</h2>
          {!loading && (
            <span className="track-count">
              {tracks.length === 0 ? 'No tracks yet' : `${tracks.length} tracks`}
            </span>
          )}
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Loading library…</p>
          </div>
        ) : (
          <LibraryGrid 
            tracks={tracks} 
            onPlayTrack={(track) => setCurrentTrack(track)} 
            onDeleteTrack={handleDeleteTrack}
          />
        )}
      </main>

      {/* ── Ambient player (when library empty, no track selected) ── */}
      <AmbientPlayer active={showAmbient} />

      {/* ── Now Playing ── */}
      {currentTrack && <Player track={currentTrack} />}

      {/* ── Upload Modal ── */}
      <UploadModal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onUploaded={() => { loadLibrary(); setShowUpload(false); }}
      />

      {/* ── Streaming Services Modal ── */}
      <StreamingServices isOpen={showServices} onClose={() => setShowServices(false)} />

      {/* ── Feature Request Widget ── */}
      <FeatureRequest />
    </div>
  );
}

export default App;
