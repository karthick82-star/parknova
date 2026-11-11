/**
 * PARKNOVA - Core Application Helpers & Utilities
 * Formatting, currency, date manipulation, query params, and demo indicators.
 */

window.PN = window.PN || {};

PN.app = {
  // Currency formatting in Indian Rupees (INR - ₹)
  formatCurrency(amount) {
    const num = Number(amount) || 0;
    return '₹' + num.toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  },

  // Date formatting (e.g. 11 Nov 2026)
  formatDate(isoString) {
    if (!isoString) return '--';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '--';
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  },

  // Time formatting (e.g. 10:30 AM)
  formatTime(isoString) {
    if (!isoString) return '--';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '--';
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  },

  // Combined Date & Time (e.g. 11 Nov 2026, 10:30 AM)
  formatDateTime(isoString) {
    if (!isoString) return '--';
    return `${this.formatDate(isoString)}, ${this.formatTime(isoString)}`;
  },

  // Parse URL query parameters into an object
  getQueryParams() {
    const params = {};
    const searchParams = new URLSearchParams(window.location.search);
    for (const [key, value] of searchParams.entries()) {
      params[key] = value;
    }
    return params;
  },

  // Calculate hours between two ISO timestamps
  calculateDurationHours(startIso, endIso) {
    const start = new Date(startIso).getTime();
    const end = new Date(endIso).getTime();
    if (isNaN(start) || isNaN(end) || end <= start) return 1;
    const diffHours = (end - start) / (1000 * 60 * 60);
    return Math.max(1, Math.ceil(diffHours));
  },

  // Prevent XSS in dynamic HTML injections
  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  },

  // Initialize common UI elements like the Demo Notice and Mobile Sidebar togglers
  initCommonUI() {
    // 1. Insert Demo Notice & Firebase Cloud Status if not already present
    if (!document.querySelector('.demo-banner')) {
      const banner = document.createElement('div');
      banner.className = 'demo-banner';
      banner.innerHTML = `
        <span id="firebase-status-badge" class="badge badge-green" style="font-size:0.75rem;"><i class="fa-solid fa-cloud-arrow-up"></i> Firebase: Connected</span>
        <span><strong>PARKNOVA:</strong> Live Cloud Database (Firebase <code>parknova-6798e</code>) active with real-time multi-device sync.</span>
        <button id="btn-sync-cloud" class="btn btn-sm btn-outline" style="padding:0.15rem 0.5rem; font-size:0.7rem; margin-left:0.5rem; background:white;" title="Force sync with Firebase Cloud Database"><i class="fa-solid fa-rotate"></i> Sync Cloud</button>
        <button id="btn-reset-demo" class="btn btn-sm btn-outline" style="padding:0.15rem 0.5rem; font-size:0.7rem; margin-left:0.35rem; background:white;">Reset Sample Data</button>
      `;
      document.body.insertBefore(banner, document.body.firstChild);

      const syncBtn = banner.querySelector('#btn-sync-cloud');
      if (syncBtn) {
        syncBtn.addEventListener('click', async () => {
          if (window.PN && PN.firebase) {
            PN.toast('Syncing with Firebase Cloud Database...', 'info');
            await PN.firebase.syncFromCloud();
            PN.toast('Synchronized with Firebase Cloud Database!', 'success');
            setTimeout(() => window.location.reload(), 500);
          }
        });
      }

      const resetBtn = banner.querySelector('#btn-reset-demo');
      if (resetBtn) {
        resetBtn.addEventListener('click', async () => {
          const ok = await PN.confirm('Reset Sample Data?', 'This will reload default Indian parking facilities, slots, accounts, and sample bookings in both LocalStorage and Firebase Cloud Database.');
          if (ok) {
            PN.storage.resetAll();
            PN.toast('Demo data reset and synced with Firebase!', 'success');
            setTimeout(() => window.location.reload(), 600);
          }
        });
      }
    }

    // 2. Mobile sidebar toggle handling for dashboard shells
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const sidebar = document.querySelector('.dashboard-sidebar');
    if (menuToggle && sidebar) {
      let backdrop = document.querySelector('.sidebar-backdrop');
      if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.className = 'sidebar-backdrop';
        document.body.appendChild(backdrop);
      }

      menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('sidebar-open');
        backdrop.classList.toggle('active');
      });

      backdrop.addEventListener('click', () => {
        sidebar.classList.remove('sidebar-open');
        backdrop.classList.remove('active');
      });
    }

    // 3. Public navbar mobile toggle
    const navToggle = document.querySelector('.nav-toggle-btn');
    const navLinks = document.querySelector('.nav-links');
    if (navToggle && navLinks) {
      navToggle.addEventListener('click', () => {
        navLinks.classList.toggle('nav-open');
      });
    }

    // 4. Bind logout button in sidebars
    const logoutBtn = document.querySelector('.sidebar-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        PN.auth.logout();
      });
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  PN.app.initCommonUI();
});

