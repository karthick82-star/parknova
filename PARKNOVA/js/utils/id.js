PN.id = {
  uid(prefix) { return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); },
  bookingId() {
    const d = new Date(), p = n => String(n).padStart(2, '0');
    return 'PN-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  }
};
