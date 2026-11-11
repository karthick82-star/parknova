/* Demo session in localStorage. NOT secure authentication, for prototype structure only. */
PN.session = {
  current() { return PN.storage.get('session', null); },
  user() { const s = this.current(); return s ? PN.storage.find('users', s.userId) : null; },
  start(user) { PN.storage.set('session', { userId: user.id, role: user.role, loggedInAt: new Date().toISOString() }); },
  end() { PN.storage.remove('session'); },
  homeFor(role) { return { driver: 'driver/dashboard.html', owner: 'owner/dashboard.html', admin: 'admin/dashboard.html' }[role] || 'index.html'; }
};
