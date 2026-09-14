const user = { id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'test@example.com', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: new Date().toISOString() };
function session() {
  const token = [{ alg: 'HS256', typ: 'JWT' }, { sub: user.id, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 }, 'signature'].map(x => typeof x === 'string' ? x : Buffer.from(JSON.stringify(x)).toString('base64url')).join('.');
  return { access_token: token, refresh_token: 'test-refresh-token', expires_in: 3600, token_type: 'bearer', user };
}
exports.mockCloud = async function(page) {
  const state = { remote: null, loginError: false, confirmEmail: true, workspaceDelay: 0, workspaceError: false, logins: 0 };
  await page.route('https://karibok-test.supabase.co/**', async route => {
    const url = route.request().url();
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 200, headers, body: '' });
    let body, status = 200;
    if (url.includes('/auth/v1/token')) {
      state.logins++;
      if (state.loginError) { status = 400; body = { code: 'invalid_credentials', msg: 'Invalid login credentials' }; }
      else body = session();
    } else if (url.includes('/auth/v1/signup')) body = state.confirmEmail ? { user, session: null } : session();
    else if (url.includes('/auth/v1/user')) body = user;
    else if (url.includes('/auth/v1/logout')) body = {};
    else if (url.includes('/rpc/save_workspace')) {
      const v = route.request().postDataJSON();
      if (v.expected_revision !== (state.remote?.revision || 0)) { status = 409; body = { code: '40001', message: 'Workspace changed on another device' }; }
      else { state.remote = { revision: (state.remote?.revision || 0) + 1, data: v.workspace_data }; body = state.remote.revision; }
    } else if (url.includes('/rest/v1/workspaces')) {
      if (state.workspaceDelay) await new Promise(resolve => setTimeout(resolve, state.workspaceDelay));
      if (state.workspaceError) { status = 500; body = { message: 'Connection unavailable' }; }
      else body = state.remote;
    } else { status = 404; body = { message: 'Unexpected test route ' + url }; }
    await route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(body) });
  });
  return state;
};
exports.signIn = async function(page) {
  await page.getByLabel('Email', { exact: true }).fill('test@example.com');
  await page.getByLabel('Password', { exact: true }).fill('test-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.locator('.app').waitFor();
};
