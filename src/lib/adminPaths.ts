const ADMIN_BASE = import.meta.env.VITE_ADMIN_BASE || '';

export const adminPaths = {
  login: `${ADMIN_BASE}/login`,
  dashboard: `${ADMIN_BASE}/dashboard`,
  requests: `${ADMIN_BASE}/requests`,
  revenue: `${ADMIN_BASE}/revenue`,
  contacts: `${ADMIN_BASE}/contacts`,
};
