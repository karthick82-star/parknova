/* Each validator returns an error message string, or '' when valid */
PN.validate = {
  required(v, label) { return String(v || '').trim() ? '' : (label || 'This field') + ' is required.'; },
  email(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Enter a valid email address.'; },
  phone(v) { return /^[6-9]\d{9}$/.test(v) ? '' : 'Enter a valid 10-digit Indian mobile number.'; },
  password(v) { return /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(v) ? '' : 'Use at least 8 characters with a letter and a number.'; },
  vehicleNumber(v) { return /^[A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,3}\s?\d{4}$/i.test(v.trim()) ? '' : 'Use a format like TN 45 AB 1234.'; },
  /* Show/clear an error under a field (expects a .field-error sibling) */
  show(input, msg) {
    input.classList.toggle('is-invalid', !!msg);
    const box = input.parentElement.querySelector('.field-error'); if (box) box.textContent = msg;
    return !msg;
  }
};
