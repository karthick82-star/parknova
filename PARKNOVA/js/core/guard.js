/* Call PN.guard.require('driver') at the top of a protected page. Pass an array to allow several roles. */
PN.guard = {
  require(roles) {
    roles = [].concat(roles);
    const user = PN.session.user();
    if (!user) { location.replace(PN.url('login.html') + '?next=' + encodeURIComponent(location.pathname)); return null; }
    if (user.status !== 'active') { PN.session.end(); location.replace(PN.url('login.html') + '?blocked=1'); return null; }
    if (!roles.includes(user.role)) { location.replace(PN.url(PN.session.homeFor(user.role))); return null; }
    return user;
  }
};
