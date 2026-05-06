import React, { useState, useEffect, useRef } from 'react';
import {
  OAUTH_CONFIGS,
  buildAuthUrl,
  loadTokens,
  clearTokens,
  isTokenExpired,
  REDIRECT_URI,
  saveTokens,
} from '../hooks/useOAuth';

// ─── Spotify Wizard ───────────────────────────────────────────────────────────
// A dedicated step-by-step guide specifically for Spotify, since it's the most
// requested and has the most specific setup requirements.

const SPOTIFY_COLOR = '#1DB954';

const SpotifyWizard = ({ onConnected, onCancel }) => {
  const [step, setStep]           = useState(0); // 0 = intro, 1 = copy uri, 2 = client id, 3 = logging in
  const [clientId, setClientId]   = useState('');
  const [copied, setCopied]       = useState(false);
  const [idValid, setIdValid]     = useState(null); // null | true | false
  const [error, setError]         = useState('');
  const inputRef                  = useRef(null);

  // Spotify client IDs are 32-char hex strings
  const validateId = (val) => /^[0-9a-f]{32}$/i.test(val.trim());

  const handleIdChange = (val) => {
    setClientId(val);
    setIdValid(val.length === 0 ? null : validateId(val));
    setError('');
  };

  const copyUri = () => {
    navigator.clipboard?.writeText(REDIRECT_URI).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleLaunch = async () => {
    if (!validateId(clientId)) { setError('Client ID should be 32 hex characters'); return; }
    setError('');
    setStep(3);
    try {
      const url = await buildAuthUrl('spotify', clientId.trim(), '');
      const popup = window.open(url, 'spotify_oauth', 'width=480,height=720,resizable=yes,scrollbars=yes');
      if (!popup) {
        // Popup blocked — fallback to redirect
        window.location.href = url;
        return;
      }
      // Poll for popup close
      const poll = setInterval(() => {
        try {
          if (!popup || popup.closed) {
            clearInterval(poll);
            const saved = loadTokens('spotify');
            if (saved && !isTokenExpired(saved)) {
              onConnected(saved);
            } else {
              setStep(2);
              setError('Authorization was cancelled or failed. Try again.');
            }
          }
        } catch (_) { /* cross-origin while navigating */ }
      }, 500);
    } catch (e) {
      setError(e.message);
      setStep(2);
    }
  };

  // ── Step content ─────────────────────────────────────────────────────────────
  const steps = [
    // Step 0 — intro
    <div className="sp-step" key="intro">
      <div className="sp-hero">
        <span className="sp-big-icon">🎧</span>
        <h3 className="sp-title">Connect Spotify</h3>
        <p className="sp-desc">
          We'll walk you through creating a free Spotify developer app — takes about 2 minutes.
          No credit card needed. Works with any Spotify account (Free or Premium).
        </p>
      </div>
      <div className="sp-checklist">
        <div className="sp-check">✅ Free Spotify account required</div>
        <div className="sp-check">✅ Uses PKCE — no client secret needed</div>
        <div className="sp-check">✅ Token stored only in your browser</div>
      </div>
      <div className="sp-actions">
        <a
          href="https://developer.spotify.com/dashboard"
          target="_blank"
          rel="noreferrer"
          className="btn-spotify-primary"
          onClick={() => setTimeout(() => setStep(1), 400)}
        >
          Open Spotify Dashboard ↗
        </a>
        <button className="btn-spotify-ghost" onClick={() => setStep(1)}>
          I already have an app →
        </button>
      </div>
    </div>,

    // Step 1 — copy redirect URI
    <div className="sp-step" key="uri">
      <div className="sp-step-badge">Step 1 of 2</div>
      <h3 className="sp-title">Add your Redirect URI</h3>
      <p className="sp-desc">
        In your Spotify app settings, scroll to <strong>Redirect URIs</strong> and add the URI below,
        then click <strong>Save</strong>.
      </p>

      <div className="sp-uri-box">
        <code className="sp-uri-code">{REDIRECT_URI}</code>
        <button
          className={`btn-copy ${copied ? 'copied' : ''}`}
          onClick={copyUri}
        >
          {copied ? '✅ Copied!' : '📋 Copy'}
        </button>
      </div>

      <div className="sp-tip">
        💡 <strong>Where to find it:</strong> Spotify Dashboard → your app → <em>Settings</em> → <em>Redirect URIs</em>
      </div>

      <div className="sp-actions">
        <button className="btn-spotify-primary" onClick={() => { setStep(2); setTimeout(() => inputRef.current?.focus(), 100); }}>
          Done, I added it →
        </button>
        <button className="btn-spotify-ghost" onClick={() => setStep(0)}>← Back</button>
      </div>
    </div>,

    // Step 2 — paste client ID
    <div className="sp-step" key="clientid">
      <div className="sp-step-badge">Step 2 of 2</div>
      <h3 className="sp-title">Paste your Client ID</h3>
      <p className="sp-desc">
        Copy your <strong>Client ID</strong> from the Spotify Dashboard app overview page and paste it below.
      </p>

      <div className={`sp-input-wrap ${idValid === true ? 'valid' : idValid === false ? 'invalid' : ''}`}>
        <input
          ref={inputRef}
          className="sp-input"
          placeholder="e.g. 3f2d1a4b8c9e0f1a2b3c4d5e6f7a8b9c"
          value={clientId}
          onChange={e => handleIdChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && idValid && handleLaunch()}
          spellCheck={false}
          autoComplete="off"
        />
        <span className="sp-input-status">
          {idValid === true ? '✅' : idValid === false ? '❌' : ''}
        </span>
      </div>

      {idValid === false && (
        <p className="sp-input-hint">Client IDs are 32 hex characters (letters a–f and digits 0–9)</p>
      )}
      {idValid === true && (
        <p className="sp-input-hint valid">Looks good!</p>
      )}
      {error && <p className="sp-error">{error}</p>}

      <div className="sp-tip">
        💡 <strong>Where to find it:</strong> Spotify Dashboard → your app → copy the <em>Client ID</em> at the top
      </div>

      <div className="sp-actions">
        <button
          className="btn-spotify-primary"
          disabled={!idValid}
          onClick={handleLaunch}
        >
          🔑 Login with Spotify
        </button>
        <button className="btn-spotify-ghost" onClick={() => setStep(1)}>← Back</button>
      </div>
    </div>,

    // Step 3 — waiting for popup
    <div className="sp-step sp-step-waiting" key="waiting">
      <div className="sp-spinner-ring" />
      <h3 className="sp-title">Waiting for Spotify…</h3>
      <p className="sp-desc">
        A popup opened with the Spotify login page. Authorize the app there, then come back here.
      </p>
      <p className="sp-desc" style={{ fontSize: '0.78rem', opacity: 0.6 }}>
        If the popup was blocked, allow popups for this page and try again.
      </p>
      <button className="btn-spotify-ghost" onClick={() => { setStep(2); setError(''); }}>
        Cancel
      </button>
    </div>,
  ];

  return (
    <div className="spotify-wizard">
      {/* Progress dots */}
      {step < 3 && (
        <div className="sp-dots">
          {[0, 1, 2].map(i => (
            <div key={i} className={`sp-dot ${i === step ? 'active' : i < step ? 'done' : ''}`} />
          ))}
        </div>
      )}
      {steps[step]}
      <button className="sp-cancel-x" onClick={onCancel} title="Cancel">✕</button>
    </div>
  );
};

// ─── Per-service OAuth card ───────────────────────────────────────────────────

const ServiceCard = ({ svcId }) => {
  const cfg = OAUTH_CONFIGS[svcId];
  const [mode, setMode]           = useState('idle'); // idle | wizard | setup | connecting | connected
  const [clientId, setClientId]   = useState('');
  const [clientSecret, setSecret] = useState('');
  const [devToken, setDevToken]   = useState('');
  const [tokenData, setTokenData] = useState(() => loadTokens(svcId));
  const [error, setError]         = useState('');

  const connected = tokenData && !isTokenExpired(tokenData);

  // Check if we just returned from OAuth
  useEffect(() => {
    const pending = localStorage.getItem('pt_last_oauth_svc');
    if (pending === svcId) {
      const saved = loadTokens(svcId);
      if (saved) { setTokenData(saved); setMode('connected'); }
    }
  }, [svcId]);

  const handleDisconnect = () => {
    clearTokens(svcId);
    setTokenData(null);
    setClientId(''); setSecret(''); setDevToken('');
    setMode('idle'); setError('');
  };

  const handleGenericOAuth = async () => {
    if (!clientId.trim()) { setError('Client ID is required'); return; }
    setError('');
    try {
      const url = await buildAuthUrl(svcId, clientId.trim(), clientSecret.trim());
      const popup = window.open(url, `oauth_${svcId}`, 'width=500,height=700,resizable=yes');
      setMode('connecting');
      const poll = setInterval(() => {
        try {
          if (!popup || popup.closed) {
            clearInterval(poll);
            const saved = loadTokens(svcId);
            if (saved && !isTokenExpired(saved)) {
              setTokenData(saved); setMode('connected');
            } else {
              setMode('setup');
              setError('Authorization cancelled or failed.');
            }
          }
        } catch (_) {}
      }, 500);
    } catch (e) { setError(e.message); }
  };

  const handleAppleToken = () => {
    if (!devToken.trim()) { setError('Token required'); return; }
    const tokens = { access_token: devToken.trim(), expires_in: 86400 * 180 };
    saveTokens(svcId, tokens);
    setTokenData(tokens); setMode('connected');
  };

  // ── Spotify gets its own wizard ──────────────────────────────────────────────
  if (svcId === 'spotify') {
    if (mode === 'wizard') {
      return (
        <SpotifyWizard
          onConnected={(tokens) => { setTokenData(tokens); setMode('connected'); }}
          onCancel={() => setMode('idle')}
        />
      );
    }
    return (
      <div className={`service-card ${connected ? 'service-connected' : ''}`}>
        <div className="service-row-inner">
          <span className="service-icon" style={{ background: '#1DB95422', border: '1px solid #1DB95455' }}>
            {cfg.icon}
          </span>
          <div className="service-meta">
            <div className="service-name">{cfg.name}</div>
            <div className="service-hint">
              {connected ? '✅ Connected via OAuth 2.0 (PKCE)' : 'Guided setup — takes ~2 minutes'}
            </div>
          </div>
          <div className="service-btns">
            {connected
              ? <button className="btn-disconnect" onClick={handleDisconnect}>Disconnect</button>
              : <button className="btn-spotify-connect" onClick={() => setMode('wizard')}>
                  Connect →
                </button>
            }
          </div>
        </div>
      </div>
    );
  }

  // ── Generic card for all other services ─────────────────────────────────────
  return (
    <div className={`service-card ${connected ? 'service-connected' : ''}`}>
      <div className="service-row-inner">
        <span className="service-icon" style={{ background: cfg.color + '22', border: `1px solid ${cfg.color}55` }}>
          {cfg.icon}
        </span>
        <div className="service-meta">
          <div className="service-name">{cfg.name}</div>
          <div className="service-hint">
            {connected ? '✅ Connected via OAuth'
              : mode === 'connecting' ? '⏳ Authorizing…'
              : 'OAuth 2.0 Login'}
          </div>
        </div>
        <div className="service-btns">
          {connected
            ? <button className="btn-disconnect" onClick={handleDisconnect}>Disconnect</button>
            : mode === 'idle'
            ? <button className="btn-connect" onClick={() => setMode('setup')}>Connect</button>
            : mode === 'connecting'
            ? <button className="btn-cancel-sm" onClick={() => setMode('setup')}>Cancel</button>
            : null}
        </div>
      </div>

      {mode === 'setup' && !connected && (
        <div className="oauth-setup-panel">
          <div className="oauth-steps">
            <a href={cfg.setupUrl} target="_blank" rel="noreferrer" className="setup-link">
              🔗 Open {cfg.name} Developer Portal ↗
            </a>
            <ol className="step-list">
              {(cfg.setupSteps || []).map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          </div>

          {cfg.devToken ? (
            <>
              <input className="oauth-input" placeholder="Developer Token (JWT)" value={devToken}
                onChange={e => setDevToken(e.target.value)} />
              <div className="oauth-actions">
                <button className="btn-oauth" onClick={handleAppleToken}>Save Token</button>
                <button className="btn-cancel-sm" onClick={() => setMode('idle')}>Cancel</button>
              </div>
            </>
          ) : (
            <>
              <input className="oauth-input" placeholder="Client ID" value={clientId}
                onChange={e => setClientId(e.target.value)} />
              {cfg.needsSecret && (
                <input className="oauth-input" type="password" placeholder="Client Secret" value={clientSecret}
                  onChange={e => setSecret(e.target.value)} />
              )}
              {!cfg.needsSecret && (
                <p className="oauth-note">🔐 PKCE flow — no client secret required.</p>
              )}
              {cfg.needsSecret && (
                <p className="oauth-note oauth-warning">⚠️ Client secrets should only be used server-side. Demo only.</p>
              )}
              <div className="oauth-redirect">
                <span>Redirect URI:</span>
                <code onClick={() => navigator.clipboard?.writeText(REDIRECT_URI)} title="Click to copy">{REDIRECT_URI}</code>
              </div>
              {error && <p className="oauth-error">❌ {error}</p>}
              <div className="oauth-actions">
                <button className="btn-oauth" onClick={handleGenericOAuth}>🔑 Login with {cfg.name}</button>
                <button className="btn-cancel-sm" onClick={() => setMode('idle')}>Cancel</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main modal ───────────────────────────────────────────────────────────────

const StreamingServices = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState('services');
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel modal-wide" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.6rem' }}>💩</span>
            <h2 className="modal-title">Streaming Services</h2>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-tabs">
          <button className={`modal-tab ${tab === 'services' ? 'modal-tab-active' : ''}`} onClick={() => setTab('services')}>🔌 Services</button>
          <button className={`modal-tab ${tab === 'custom' ? 'modal-tab-active' : ''}`} onClick={() => setTab('custom')}>➕ Custom</button>
        </div>

        {tab === 'services' && (
          <div className="services-scroll">
            <p className="modal-subtitle">
              Connect your streaming accounts. Spotify has a guided setup — all others use standard OAuth.
            </p>
            <div className="services-list">
              {Object.keys(OAUTH_CONFIGS).map(id => (
                <ServiceCard key={id} svcId={id} />
              ))}
            </div>
          </div>
        )}

        {tab === 'custom' && <CustomServiceTab />}
      </div>
    </div>
  );
};

// ─── Custom service tab ───────────────────────────────────────────────────────

const CustomServiceTab = () => {
  const [form, setForm] = useState({ name: '', url: '', token: '' });
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.url) return;
    const existing = JSON.parse(localStorage.getItem('pt_custom_services') || '[]');
    existing.push({ ...form, id: `custom_${Date.now()}` });
    localStorage.setItem('pt_custom_services', JSON.stringify(existing));
    setSaved(true);
    setForm({ name: '', url: '', token: '' });
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="custom-tab">
      <p className="modal-subtitle">Add any OpenAPI-compatible music server (Jellyfin, Navidrome, Subsonic, etc.)</p>
      <form className="custom-form" onSubmit={handleSubmit}>
        <label className="custom-label">Service Name</label>
        <input className="custom-input" placeholder="e.g. My Jellyfin Server" value={form.name}
          onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
        <label className="custom-label">Base URL</label>
        <input className="custom-input" placeholder="https://music.myserver.local" value={form.url}
          onChange={e => setForm(p => ({ ...p, url: e.target.value }))} />
        <label className="custom-label">API Token / Password <span className="optional">(optional)</span></label>
        <input className="custom-input" type="password" placeholder="••••••••" value={form.token}
          onChange={e => setForm(p => ({ ...p, token: e.target.value }))} />
        <button type="submit" className="btn-add-custom">
          {saved ? '✅ Service Saved!' : 'Add Service'}
        </button>
      </form>
    </div>
  );
};

export default StreamingServices;
