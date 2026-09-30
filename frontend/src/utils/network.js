import client from '../api/client';

let cachedIp = null;

export async function fetchHostIp() {
  if (cachedIp) return cachedIp;
  try {
    const res = await client.get('/network-ip');
    if (res.data?.ip && res.data.ip !== 'localhost') {
      cachedIp = res.data.ip;
      return cachedIp;
    }
  } catch (e) {
    // ignore
  }
  return cachedIp;
}

export function getJoinBaseUrl(hostIp) {
  if (typeof window === 'undefined') return '';
  const port = window.location.port ? `:${window.location.port}` : '';
  const protocol = window.location.protocol;
  // If viewing on localhost or 127.0.0.1, replace hostname with LAN IP so phone cameras can reach it
  if ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && hostIp) {
    return `${protocol}//${hostIp}${port}`;
  }
  return window.location.origin;
}
