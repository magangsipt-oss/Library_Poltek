(function () {
  const configuredBase = window.LIBRARY_API_BASE;
  const isLocalFrontend = window.location.port !== '3000';
  const baseUrl = configuredBase || (isLocalFrontend
    ? 'http://localhost:3000/api'
    : `${window.location.origin}/api`);

  async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers
      }
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.error || `Permintaan gagal (${response.status}).`);
    }

    return payload;
  }

  window.libraryApi = { baseUrl, request };
})();