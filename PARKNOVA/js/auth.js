/**
 * PARKNOVA - Authentication & Role Access Control
 * Handles login, registration, sessions, and route guards.
 * Connected with LocalStorage and Firebase Realtime Database.
 */

window.PN = window.PN || {};

PN.auth = {
  // Get active session
  getSession() {
    return PN.storage.get('session', null);
  },

  // Get currently logged-in user object safely without side-effect redirects
  currentUser() {
    const session = this.getSession();
    if (!session || !session.userId) return null;

    let user = PN.storage.find('users', session.userId);

    // If not found by ID directly in local storage, check by email
    if (!user && session.email) {
      user = PN.storage.all('users').find(u => u && u.email && u.email.toLowerCase() === String(session.email).toLowerCase());
    }

    // If still not found, but session has valid user details, rebuild user object and sync back to local users
    if (!user && session.name && session.role) {
      user = {
        id: session.userId,
        name: session.name,
        email: session.email || '',
        role: session.role,
        status: 'active',
        avatar: session.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
      };
      const users = PN.storage.all('users');
      if (!users.some(u => u && u.id === user.id)) {
        users.push(user);
        try {
          localStorage.setItem(PN.STORAGE_PREFIX + 'users', JSON.stringify(users));
        } catch (e) {}
      }
    }

    if (!user || user.status !== 'active') {
      PN.storage.remove('session'); // Clear deactivated or invalid session
      return null;
    }
    return user;
  },

  isAuthenticated() {
    return this.currentUser() !== null;
  },

  // Return appropriate home/dashboard link for user role
  getDashboardUrl(role) {
    const root = (document.body && document.body.dataset.root) || '';
    switch (role) {
      case 'driver': return root + 'driver/dashboard.html';
      case 'owner': return root + 'owner/dashboard.html';
      case 'admin': return root + 'admin/dashboard.html';
      default: return root + 'index.html';
    }
  },

  // Login handler: validates credentials, queries cloud DB if needed, and sets clean session
  async login(email, password, expectedRole = null) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    let users = PN.storage.all('users');
    let user = users.find(u => u && u.email && u.email.trim().toLowerCase() === cleanEmail);

    // If not found in LocalStorage, check Firebase Cloud Database directly
    if (!user && window.PN && PN.firebase && PN.firebase.dbUrl) {
      try {
        const res = await fetch(`${PN.firebase.dbUrl}/users.json`);
        if (res.ok) {
          const cloudUsersData = await res.json();
          if (cloudUsersData) {
            const cloudUsers = Array.isArray(cloudUsersData)
              ? cloudUsersData.filter(u => u !== null)
              : Object.values(cloudUsersData);
            
            // Merge cloud users into local storage
            const map = new Map();
            users.forEach(u => { if (u && (u.id || u.email)) map.set(u.id || u.email, u); });
            cloudUsers.forEach(u => { if (u && (u.id || u.email)) map.set(u.id || u.email, u); });
            users = Array.from(map.values());
            try {
              localStorage.setItem(PN.STORAGE_PREFIX + 'users', JSON.stringify(users));
            } catch (e) {}
            user = users.find(u => u && u.email && u.email.trim().toLowerCase() === cleanEmail);
          }
        }
      } catch (err) {
        console.warn('Firebase user lookup warning:', err.message);
      }
    }

    if (!user) {
      return { success: false, message: 'No account found with this email address. Please check your spelling or register.' };
    }

    if (user.password !== password) {
      return { success: false, message: 'Invalid password. Please check your password and try again.' };
    }

    if (user.status !== 'active') {
      return { success: false, message: 'Your account has been deactivated. Please contact platform support.' };
    }

    // Always clear old session first to prevent account bleed
    PN.storage.remove('session');

    // Save session aligned to user's registered role
    const sessionData = {
      userId: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      loggedInAt: new Date().toISOString()
    };
    PN.storage.set('session', sessionData);

    return { 
      success: true, 
      user: user, 
      redirectUrl: this.getDashboardUrl(user.role) 
    };
  },

  // Register new driver or owner
  async register(userData) {
    const { name, email, phone, password, role } = userData;

    if (role === 'admin') {
      return { success: false, message: 'Admin accounts cannot be registered publicly.' };
    }

    if (role !== 'driver' && role !== 'owner') {
      return { success: false, message: 'Invalid role specified.' };
    }

    const cleanEmail = String(email || '').trim().toLowerCase();

    // Check duplicate email locally and in cloud
    let users = PN.storage.all('users');
    let exists = users.find(u => u && u.email && u.email.toLowerCase() === cleanEmail);

    if (!exists && window.PN && PN.firebase && PN.firebase.dbUrl) {
      try {
        const res = await fetch(`${PN.firebase.dbUrl}/users.json`);
        if (res.ok) {
          const cloudUsersData = await res.json();
          if (cloudUsersData) {
            const cloudUsers = Array.isArray(cloudUsersData)
              ? cloudUsersData.filter(u => u !== null)
              : Object.values(cloudUsersData);
            exists = cloudUsers.find(u => u && u.email && u.email.toLowerCase() === cleanEmail);
          }
        }
      } catch (e) {}
    }

    if (exists) {
      return { success: false, message: 'An account with this email address already exists. Please sign in.' };
    }

    const newUser = {
      id: 'user_' + role + '_' + Date.now().toString(36),
      name: String(name).trim(),
      email: cleanEmail,
      phone: String(phone).trim(),
      password: password,
      role: role,
      status: 'active',
      createdAt: new Date().toISOString(),
      avatar: name.trim().split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase() || 'U'
    };

    // Save locally
    PN.storage.insert('users', newUser);

    // Save to Firebase Cloud Database
    if (window.PN && PN.firebase && typeof PN.firebase.pushTable === 'function') {
      PN.firebase.pushTable('users', PN.storage.all('users'));
    }

    // Force clear old session and auto-login newly registered user
    PN.storage.remove('session');
    const sessionData = {
      userId: newUser.id,
      role: newUser.role,
      name: newUser.name,
      email: newUser.email,
      loggedInAt: new Date().toISOString()
    };
    PN.storage.set('session', sessionData);

    return { 
      success: true, 
      user: newUser, 
      redirectUrl: this.getDashboardUrl(newUser.role) 
    };
  },

  // Logout safely
  logout() {
    PN.storage.remove('session');
    const root = (document.body && document.body.dataset.root) || '';
    if (!window.location.pathname.endsWith('login.html')) {
      window.location.href = root + 'login.html';
    } else {
      window.location.reload();
    }
  },

  // Page Route Guard
  // Strictly checks active user. Never forces a demo account overwrite.
  requireAuth(allowedRoles = []) {
    const root = (document.body && document.body.dataset.root) || '';
    const user = this.currentUser();
    const roles = Array.isArray(allowedRoles) ? allowedRoles : (allowedRoles ? [allowedRoles] : []);

    // Not authenticated -> redirect to login
    if (!user) {
      const currentPath = window.location.pathname;
      if (!currentPath.endsWith('login.html')) {
        window.location.href = root + 'login.html?next=' + encodeURIComponent(currentPath);
      }
      return null;
    }

    // Role mismatch -> redirect to appropriate portal
    if (roles.length > 0 && !roles.includes(user.role)) {
      console.warn(`PARKNOVA: Role mismatch. Current: ${user.role}, Required: ${roles.join(',')}. Redirecting.`);
      window.location.href = this.getDashboardUrl(user.role);
      return null;
    }

    return user;
  }
};
