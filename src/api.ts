export interface UserInfo {
  email: string;
  tenantId: string;
  tenantName: string;
  role: string;
  subscriptionStatus: string;
  planType: string;
  maxProperties: number;
}

export const getAuthToken = () => localStorage.getItem('token');
export const setAuthToken = (token: string) => localStorage.setItem('token', token);
export const removeAuthToken = () => localStorage.removeItem('token');

export const getUserInfo = (): UserInfo | null => {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return {
      email:              payload.upn || payload.sub,
      tenantId:           payload.tenant_id,
      tenantName:         payload.tenant_name || '',
      role:               Array.isArray(payload.groups) ? payload.groups[0] : payload.groups || 'USER',
      subscriptionStatus: payload.subscription_status || 'TRIALING',
      planType:           payload.plan_type || 'TRIAL',
      maxProperties:      payload.max_properties ?? 2,
    };
  } catch (e) {
    return null;
  }
};

export const apiFetch = async (url: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    if (!url.includes('/api/auth/')) {
      removeAuthToken();
      window.location.reload();
    }
    throw new Error('Email o password errate');
  }

  if (response.status === 402) {
    window.dispatchEvent(new CustomEvent('subscription-expired'));
    throw new Error('Abbonamento scaduto');
  }

  return response;
};
