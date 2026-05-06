import axios from 'axios';

// In Docker (nginx proxied), use relative /api
// In dev mode (Vite proxy), also relative. Direct backend is only needed for bare server.
const api = axios.create({
  baseURL: '/api'
});

export default api;
