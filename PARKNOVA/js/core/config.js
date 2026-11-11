/* Global namespace + settings. Every other script attaches to window.PN */
window.PN = window.PN || {};
PN.config = {
  brand: 'PARKNOVA',
  tagline: 'Find Your Space. Park with Confidence.',
  prefix: 'parknova_',
  seedVersion: 1,
  graceMinutes: 15,           // booking expires if no check-in after start + 15 min
  currency: '₹',
  // Folder prefix to reach project root from the current page ("" or "../")
  root: (document.body && document.body.dataset.root) || ''
};
PN.url = function (path) { return PN.config.root + path; };
