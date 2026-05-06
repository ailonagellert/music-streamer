// ─── PKCE helpers ────────────────────────────────────────────────────────────

function base64URLEncode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export async function generatePKCE() {
  const verifier = base64URLEncode(crypto.getRandomValues(new Uint8Array(32)));
  const hash     = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const challenge = base64URLEncode(hash);
  return { verifier, challenge };
}

export function generateState() {
  return base64URLEncode(crypto.getRandomValues(new Uint8Array(16)));
}

// ─── Token storage ────────────────────────────────────────────────────────────

const KEY = (svcId) => `pt_oauth_${svcId}`;

export function saveTokens(svcId, tokens) {
  localStorage.setItem(KEY(svcId), JSON.stringify({
    ...tokens,
    savedAt: Date.now(),
  }));
}

export function loadTokens(svcId) {
  try {
    const raw = localStorage.getItem(KEY(svcId));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearTokens(svcId) {
  localStorage.removeItem(KEY(svcId));
  localStorage.removeItem(`pt_pkce_verifier_${svcId}`);
  localStorage.removeItem(`pt_oauth_state_${svcId}`);
}

export function isTokenExpired(tokens) {
  if (!tokens?.savedAt || !tokens?.expires_in) return true;
  return Date.now() > tokens.savedAt + tokens.expires_in * 1000 - 60_000;
}

// ─── OAuth URL builders ───────────────────────────────────────────────────────

export const REDIRECT_URI = `${window.location.origin}/callback`;

export const OAUTH_CONFIGS = {
  spotify: {
    name:        'Spotify',
    icon:        '🎧',
    color:       '#1DB954',
    authUrl:     'https://accounts.spotify.com/authorize',
    tokenUrl:    'https://accounts.spotify.com/api/token',
    scopes:      'user-read-playback-state user-modify-playback-state streaming user-library-read playlist-read-private user-read-private',
    pkce:        true,
    setupUrl:    'https://developer.spotify.com/dashboard',
    setupSteps:  [
      'Go to developer.spotify.com/dashboard and create an app',
      `Set Redirect URI to: ${window.location.origin}/callback`,
      'Copy your Client ID below',
    ],
    needsSecret: false,
  },
  tidal: {
    name:        'Tidal',
    icon:        '🌊',
    color:       '#00FFFF',
    authUrl:     'https://login.tidal.com/oauth2/authorize',
    tokenUrl:    'https://login.tidal.com/oauth2/token',
    scopes:      'r_usr+w_usr+w_sub',
    pkce:        true,
    setupUrl:    'https://developer.tidal.com',
    setupSteps:  [
      'Go to developer.tidal.com and create an app',
      `Set Redirect URI to: ${window.location.origin}/callback`,
      'Copy your Client ID below',
    ],
    needsSecret: false,
  },
  youtube: {
    name:        'YouTube Music',
    icon:        '▶️',
    color:       '#FF0000',
    authUrl:     'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl:    'https://oauth2.googleapis.com/token',
    scopes:      'https://www.googleapis.com/auth/youtube.readonly',
    pkce:        true,
    setupUrl:    'https://console.cloud.google.com',
    setupSteps:  [
      'Go to console.cloud.google.com → APIs & Services → Credentials',
      'Create OAuth 2.0 Client ID (Web Application)',
      `Add Authorized redirect URI: ${window.location.origin}/callback`,
      'Copy your Client ID below',
    ],
    needsSecret: false,
  },
  amazon: {
    name:        'Amazon Music',
    icon:        '📦',
    color:       '#FF9900',
    authUrl:     'https://www.amazon.com/ap/oa',
    tokenUrl:    'https://api.amazon.com/auth/o2/token',
    scopes:      'profile postal_code',
    pkce:        false,
    setupUrl:    'https://developer.amazon.com/loginwithamazon/console/site/lwa/overview.html',
    setupSteps:  [
      'Go to developer.amazon.com → Login with Amazon',
      'Create a new Security Profile',
      `Add Return URL: ${window.location.origin}/callback`,
      'Copy your Client ID and Client Secret below',
    ],
    needsSecret: true,
  },
  deezer: {
    name:        'Deezer',
    icon:        '🎶',
    color:       '#A238FF',
    authUrl:     'https://connect.deezer.com/oauth/auth.php',
    tokenUrl:    'https://connect.deezer.com/oauth/access_token.php',
    scopes:      'basic_access,email,offline_access,listening_history',
    pkce:        false,
    setupUrl:    'https://developers.deezer.com/myapps',
    setupSteps:  [
      'Go to developers.deezer.com/myapps and create an app',
      `Set redirect URL to: ${window.location.origin}/callback`,
      'Copy your App ID (Client ID) and Secret Key below',
    ],
    needsSecret: true,
  },
  soundcloud: {
    name:        'SoundCloud',
    icon:        '☁️',
    color:       '#FF5500',
    authUrl:     'https://secure.soundcloud.com/authorize',
    tokenUrl:    'https://secure.soundcloud.com/oauth/token',
    scopes:      'non-expiring',
    pkce:        false,
    setupUrl:    'https://soundcloud.com/you/apps',
    setupSteps:  [
      'Go to soundcloud.com/you/apps and register a new app',
      `Set Redirect URI to: ${window.location.origin}/callback`,
      'Copy your Client ID and Client Secret below',
    ],
    needsSecret: true,
  },
  apple: {
    name:        'Apple Music',
    icon:        '🍎',
    color:       '#FC3C44',
    authUrl:     null, // Uses MusicKit JS — different flow
    tokenUrl:    null,
    scopes:      null,
    pkce:        false,
    setupUrl:    'https://developer.apple.com/account/resources/identifiers/list',
    setupSteps:  [
      'Apple Music uses MusicKit JS — requires an Apple Developer account',
      'Generate a MusicKit developer token in your Apple Developer portal',
      'Paste the developer token below — the user will be prompted by Apple on sign-in',
    ],
    needsSecret: false,
    devToken:    true, // special case
  },
};

// ─── Build the OAuth redirect URL ────────────────────────────────────────────

export async function buildAuthUrl(svcId, clientId, clientSecret) {
  const cfg   = OAUTH_CONFIGS[svcId];
  const state = generateState();
  localStorage.setItem(`pt_oauth_state_${svcId}`, state);

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  REDIRECT_URI,
    response_type: 'code',
    state,
    scope:         cfg.scopes,
  });

  if (cfg.pkce) {
    const { verifier, challenge } = await generatePKCE();
    localStorage.setItem(`pt_pkce_verifier_${svcId}`, verifier);
    params.set('code_challenge',        challenge);
    params.set('code_challenge_method', 'S256');
  }

  // Store client creds for the callback
  localStorage.setItem(`pt_client_${svcId}`, JSON.stringify({ clientId, clientSecret: clientSecret || '' }));
  localStorage.setItem('pt_last_oauth_svc', svcId);

  return `${cfg.authUrl}?${params.toString()}`;
}

// ─── Handle callback (called from App on mount when ?code= is in URL) ─────────

export async function handleOAuthCallback(code, state, svcId) {
  const cfg          = OAUTH_CONFIGS[svcId];
  const savedState   = localStorage.getItem(`pt_oauth_state_${svcId}`);
  if (state !== savedState) throw new Error('State mismatch — possible CSRF');

  const { clientId, clientSecret } = JSON.parse(
    localStorage.getItem(`pt_client_${svcId}`) || '{}'
  );

  const body = new URLSearchParams({
    grant_type:   'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    client_id:    clientId,
  });

  if (cfg.pkce) {
    body.set('code_verifier', localStorage.getItem(`pt_pkce_verifier_${svcId}`) || '');
  } else if (clientSecret) {
    // For non-PKCE services the token exchange needs client_secret.
    // A real app would proxy this through a backend to keep the secret safe.
    body.set('client_secret', clientSecret);
  }

  const res = await fetch(cfg.tokenUrl, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${err}`);
  }

  const tokens = await res.json();
  saveTokens(svcId, tokens);
  return tokens;
}
