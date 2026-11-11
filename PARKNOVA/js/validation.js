/**
 * PARKNOVA - Form Validation & UI Notifications
 * Provides validation rules, toast alerts, and confirmation dialogs.
 */

window.PN = window.PN || {};

PN.validate = {
  required(value, fieldName = 'This field') {
    if (value === null || value === undefined || String(value).trim() === '') {
      return `${fieldName} is required.`;
    }
    return '';
  },

  email(value) {
    if (!value) return 'Email address is required.';
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(String(value).trim())) {
      return 'Please enter a valid email address.';
    }
    return '';
  },

  phone(value) {
    if (!value) return 'Mobile number is required.';
    const cleaned = String(value).replace(/[\s\-()]/g, '');
    const regex = /^[6-9]\d{9}$/;
    if (!regex.test(cleaned)) {
      return 'Please enter a valid 10-digit Indian mobile number.';
    }
    return '';
  },

  password(value) {
    if (!value) return 'Password is required.';
    if (value.length < 8) {
      return 'Password must be at least 8 characters long.';
    }
    if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
      return 'Password must contain at least one letter and one number.';
    }
    return '';
  },

  confirmPassword(password, confirmPassword) {
    if (!confirmPassword) return 'Please confirm your password.';
    if (password !== confirmPassword) {
      return 'Passwords do not match.';
    }
    return '';
  },

  vehicleNumber(value) {
    if (!value) return 'Vehicle number is required.';
    const cleaned = String(value).trim().toUpperCase();
    // Indian plate regex e.g. TN 45 AB 1234, DL 1C AA 1111, KA 01 1234
    const regex = /^[A-Z]{2}\s?[0-9]{1,2}\s?([A-Z]{1,3})?\s?[0-9]{4}$/;
    if (!regex.test(cleaned)) {
      return 'Invalid vehicle number format. (e.g., TN 45 AB 1234)';
    }
    return '';
  },

  number(value, min = 0, fieldName = 'Amount') {
    if (value === '' || value === null || isNaN(value)) {
      return `${fieldName} must be a valid number.`;
    }
    if (Number(value) < min) {
      return `${fieldName} must be at least ${min}.`;
    }
    return '';
  },

  // Helper to visually highlight input and display error message
  showFieldError(inputEl, errorMessage) {
    if (!inputEl) return;
    const parent = inputEl.closest('.form-group') || inputEl.parentElement;
    if (!parent) return;

    if (errorMessage) {
      inputEl.classList.add('is-invalid');
      let errorBox = parent.querySelector('.field-error');
      if (!errorBox) {
        errorBox = document.createElement('div');
        errorBox.className = 'field-error';
        parent.appendChild(errorBox);
      }
      errorBox.textContent = errorMessage;
    } else {
      inputEl.classList.remove('is-invalid');
      const errorBox = parent.querySelector('.field-error');
      if (errorBox) {
        errorBox.textContent = '';
      }
    }
  },

  clearErrors(formEl) {
    if (!formEl) return;
    formEl.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    formEl.querySelectorAll('.field-error').forEach(el => el.textContent = '');
  }
};

// Toast Notifications System
PN.toast = function (message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconHtml = '<i class="fa-solid fa-circle-info"></i>';
  if (type === 'success') iconHtml = '<i class="fa-solid fa-circle-check"></i>';
  else if (type === 'error') iconHtml = '<i class="fa-solid fa-circle-exclamation"></i>';
  else if (type === 'warning') iconHtml = '<i class="fa-solid fa-triangle-exclamation"></i>';

  toast.innerHTML = `
    <span class="toast-icon">${iconHtml}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" aria-label="Close">&times;</button>
  `;

  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => {
    toast.remove();
  });

  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }
  }, duration);
};

// Modal Confirmation Dialog System (Returns Promise<boolean>)
PN.confirm = function (title, message, confirmBtnText = 'Confirm', cancelBtnText = 'Cancel') {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-box" role="dialog" aria-modal="true">
        <h3>${title}</h3>
        <p>${message}</p>
        <div class="modal-actions">
          <button class="btn btn-outline cancel-btn">${cancelBtnText}</button>
          <button class="btn btn-primary confirm-btn">${confirmBtnText}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    // Trigger animation
    setTimeout(() => overlay.classList.add('active'), 10);

    const cleanup = (result) => {
      overlay.classList.remove('active');
      setTimeout(() => {
        overlay.remove();
        resolve(result);
      }, 200);
    };

    overlay.querySelector('.cancel-btn').addEventListener('click', () => cleanup(false));
    overlay.querySelector('.confirm-btn').addEventListener('click', () => cleanup(true));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cleanup(false);
    });
  });
};

