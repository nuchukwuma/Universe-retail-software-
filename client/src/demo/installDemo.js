// The browser demo (built with "npm run build:demo"): the real server code
// runs inside this page (demoServer.gen.js, made by demo/build.mjs), so
// every /api request is answered here and the shop's data stays in this
// browser. Visitors are signed in straight away; the sidebar lets them
// switch role or start again.
import demo from './demoServer.gen.js';
import { setToken } from '../api/api';

const ROLE_KEY = 'hd_demo_role';
const ROLES = ['owner', 'manager', 'cashier'];

function currentRole() {
  try {
    const saved = localStorage.getItem(ROLE_KEY);
    return ROLES.includes(saved) ? saved : 'owner';
  } catch {
    return 'owner';
  }
}

// Sends /api requests to the server inside the page.
function routeApiRequests() {
  const networkFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    if (!url.startsWith('/api')) return networkFetch(input, init);
    await demo.ready();
    const result = await demo.handle({
      method: init.method || 'GET',
      url,
      body: init.body ? JSON.parse(init.body) : undefined,
      headers: init.headers || {},
    });
    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: { 'Content-Type': 'application/json' },
    });
  };
}

export async function installDemo() {
  routeApiRequests();
  await demo.ready();
  setToken(await demo.loginAs(currentRole()));
  localStorage.setItem('pos_login_time', new Date().toISOString());
  window.hordedeskDemo = {
    role: currentRole(),
    switchRole(role) {
      localStorage.setItem(ROLE_KEY, role);
      window.location.hash = '#/checkout';
      window.location.reload();
    },
    startAgain() {
      demo.reset();
      localStorage.clear();
      window.location.hash = '#/checkout';
      window.location.reload();
    },
  };
}
