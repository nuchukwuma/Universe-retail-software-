// Small helper for talking to the Express API.
// It adds the login token to every request and turns errors into
// friendly messages you can show on screen.

const TOKEN_KEY = 'pos_token';

// Returns the saved login token (or null if not logged in).
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

// Saves or clears the login token in the browser.
export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

// Sends a request to /api/<path> and returns the JSON response.
// Throws an Error with a readable message if something goes wrong.
// "body" is a normal object, sent as JSON.
async function request(path, method = 'GET', body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkError) {
    throw new Error('Cannot reach the server. Check that it is running and your network is on.');
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // A 401 means the token is missing or expired, so log the user out.
    if (response.status === 401 && token) {
      window.dispatchEvent(new Event('pos-session-expired'));
    }
    const error = new Error(data.message || `Request failed (${response.status})`);
    error.status = response.status; // e.g. 403
    error.code = data.code; // e.g. 'APPROVAL_REQUIRED'
    throw error;
  }

  return data;
}

// Shortcuts for each type of request.
export const api = {
  get: (path) => request(path, 'GET'),
  post: (path, body) => request(path, 'POST', body),
  put: (path, body) => request(path, 'PUT', body),
  delete: (path) => request(path, 'DELETE'),
};
