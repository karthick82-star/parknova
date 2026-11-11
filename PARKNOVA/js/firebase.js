/**
 * PARKNOVA - Firebase Realtime Database & Cloud Integration
 * Connects PARKNOVA to Google Firebase Realtime Database for live cross-device persistence.
 */

window.PN = window.PN || {};

PN.firebaseConfig = {
  apiKey: "AIzaSyDO6hcPbaffuc9bXSyug9Ex9NBIdOPKIpk",
  authDomain: "parknova-6798e.firebaseapp.com",
  databaseURL: "https://parknova-6798e-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "parknova-6798e",
  storageBucket: "parknova-6798e.firebasestorage.app",
  messagingSenderId: "899093643488",
  appId: "1:899093643488:web:7c2d28bbf62ce516b45085",
  measurementId: "G-99HTPXH16W"
};

PN.firebase = {
  dbUrl: PN.firebaseConfig.databaseURL,
  isConnected: false,
  isSyncing: false,

  // Initialize Firebase connection
  async init() {
    try {
      // Test connectivity with cloud database
      const res = await fetch(`${this.dbUrl}/meta.json`, { method: 'GET' });
      if (res.ok) {
        this.isConnected = true;
        this.updateStatusBadge(true);
        // Sync cloud database down to local state
        await this.syncFromCloud();
      } else {
        console.warn('Firebase RTDB ping returned status:', res.status);
        this.updateStatusBadge(false);
      }
    } catch (err) {
      console.warn('Firebase cloud sync unreachable, using local storage cache:', err.message);
      this.updateStatusBadge(false);
    }
  },

  // Update visual cloud badge in UI
  updateStatusBadge(isOnline) {
    const badge = document.getElementById('firebase-status-badge');
    if (badge) {
      if (isOnline) {
        badge.className = 'badge badge-green';
        badge.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Firebase: Connected';
        badge.title = 'Realtime cloud database active (parknova-6798e)';
      } else {
        badge.className = 'badge badge-yellow';
        badge.innerHTML = '<i class="fa-solid fa-cloud"></i> Firebase: Offline Cache';
      }
    }
  },

  // Pull all tables from Firebase into LocalStorage cache
  async syncFromCloud() {
    if (this.isSyncing) return;
    this.isSyncing = true;
    try {
      const res = await fetch(`${this.dbUrl}/.json`, { method: 'GET' });
      if (!res.ok) throw new Error('Cloud fetch failed');
      const cloudData = await res.json();
      
      if (cloudData && typeof cloudData === 'object') {
        const tables = ['users', 'parkings', 'floors', 'slots', 'vehicles', 'bookings', 'complaints', 'meta'];
        tables.forEach(table => {
          if (cloudData[table]) {
            // Convert object to array if Firebase serialized array with gaps
            const cloudVal = Array.isArray(cloudData[table]) 
              ? cloudData[table].filter(item => item !== null)
              : Object.values(cloudData[table]);

            if (table === 'users') {
              const localUsers = PN.storage.all('users');
              const map = new Map();
              localUsers.forEach(u => { if (u && (u.id || u.email)) map.set(u.id || u.email, u); });
              cloudVal.forEach(u => { if (u && (u.id || u.email)) map.set(u.id || u.email, u); });
              const mergedUsers = Array.from(map.values());
              localStorage.setItem(PN.STORAGE_PREFIX + 'users', JSON.stringify(mergedUsers));
            } else {
              localStorage.setItem(PN.STORAGE_PREFIX + table, JSON.stringify(cloudVal));
            }
          }
        });
        console.log('PARKNOVA: Local state synchronized with Firebase Cloud DB.');
        window.dispatchEvent(new CustomEvent('parknova:cloud-synced'));
      }
    } catch (err) {
      console.warn('Sync from cloud failed:', err.message);
    } finally {
      this.isSyncing = false;
    }
  },

  // Push single table or entire database to Firebase
  async pushTable(table, data) {
    try {
      const url = `${this.dbUrl}/${table}.json`;
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        this.isConnected = true;
        this.updateStatusBadge(true);
      }
    } catch (err) {
      console.warn(`Failed to push table "${table}" to Firebase:`, err.message);
      this.isConnected = false;
      this.updateStatusBadge(false);
    }
  },

  // Push full database dump to Firebase
  async pushAllToCloud() {
    try {
      const tables = ['users', 'parkings', 'floors', 'slots', 'vehicles', 'bookings', 'complaints', 'meta'];
      const dump = {};
      tables.forEach(t => {
        dump[t] = PN.storage.all(t);
      });
      dump.meta = PN.storage.get('meta');

      const res = await fetch(`${this.dbUrl}/.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dump)
      });

      if (res.ok) {
        if (PN.toast) PN.toast('Cloud database updated with all records!', 'success');
        this.updateStatusBadge(true);
      }
    } catch (err) {
      if (PN.toast) PN.toast('Cloud push failed: ' + err.message, 'error');
    }
  }
};

// Auto-initialize Firebase cloud sync
document.addEventListener('DOMContentLoaded', () => {
  PN.firebase.init();
});

