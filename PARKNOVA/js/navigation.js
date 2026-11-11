/**
 * PARKNOVA - Navigation Bar & Header Controller
 * Handles active route states, user session pills, and responsive menu behavior.
 */

window.PN = window.PN || {};

PN.nav = {
  init() {
    this.updateNavbarAuth();
    this.highlightActiveLinks();
  },

  // Updates public navbar with user information or Login/Register buttons
  updateNavbarAuth() {
    const user = PN.auth.currentUser();
    const navCta = document.querySelector('.nav-cta');
    const root = (document.body && document.body.dataset.root) || '';

    if (!navCta) return;

    if (user) {
      const dashboardUrl = PN.auth.getDashboardUrl(user.role);
      navCta.innerHTML = `
        <a href="${dashboardUrl}" class="btn btn-outline btn-sm">
          <i class="fa-solid fa-gauge-high"></i> Dashboard
        </a>
        <div class="user-pill d-flex align-center gap-1" style="background:#E2E8F0; padding:0.35rem 0.75rem; border-radius:99px; font-size:0.8rem; font-weight:600;">
          <span style="width:24px; height:24px; border-radius:50%; background:var(--primary); color:white; display:grid; place-items:center; font-size:0.7rem;">
            ${user.avatar || 'U'}
          </span>
          <span>${PN.app.escapeHtml(user.name.split(' ')[0])}</span>
        </div>
        <button id="nav-logout-btn" class="btn btn-danger btn-sm" title="Log out">
          <i class="fa-solid fa-arrow-right-from-bracket"></i>
        </button>
      `;

      const logoutBtn = document.getElementById('nav-logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => PN.auth.logout());
      }
    } else {
      navCta.innerHTML = `
        <a href="${root}login.html" class="btn btn-outline btn-sm">Sign In</a>
        <a href="${root}register.html" class="btn btn-primary btn-sm">Get Started</a>
      `;
    }
  },

  // Highlight active page link in sidebar and navbar
  highlightActiveLinks() {
    const currentPath = window.location.pathname.toLowerCase();
    
    // Check all sidebar links
    document.querySelectorAll('.sidebar-link').forEach(link => {
      const href = link.getAttribute('href');
      if (href && currentPath.endsWith(href.toLowerCase())) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Check public nav links
    document.querySelectorAll('.nav-links a').forEach(link => {
      const href = link.getAttribute('href');
      if (href && currentPath.endsWith(href.toLowerCase())) {
        link.classList.add('active');
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  PN.nav.init();
});

