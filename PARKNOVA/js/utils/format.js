PN.format = {
  money(n) { return PN.config.currency + Number(n || 0).toLocaleString('en-IN'); },
  date(iso) { return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); },
  time(iso) { return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }); },
  dateTime(iso) { return this.date(iso) + ', ' + this.time(iso); },
  escape(s) { const d = document.createElement('div'); d.textContent = s == null ? '' : s; return d.innerHTML; }
};
