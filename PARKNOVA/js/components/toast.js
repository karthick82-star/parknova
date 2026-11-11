PN.toast = function (message, type) {
  let root = document.getElementById('toast-root');
  if (!root) { root = document.createElement('div'); root.id = 'toast-root'; root.setAttribute('role', 'status'); document.body.appendChild(root); }
  const t = document.createElement('div'); t.className = 'toast ' + (type || ''); t.textContent = message;
  root.appendChild(t); setTimeout(() => t.remove(), 3500);
};
PN.confirm = function (title, text) {           // returns a Promise<boolean>
  return new Promise(resolve => {
    const b = document.createElement('div'); b.className = 'modal-backdrop';
    b.innerHTML = '<div class="modal" role="dialog" aria-modal="true"><h3></h3><p class="muted"></p><div class="modal-actions"><button class="btn btn-outline" data-v="0">Cancel</button><button class="btn btn-primary" data-v="1">Confirm</button></div></div>';
    b.querySelector('h3').textContent = title; b.querySelector('p').textContent = text;
    b.addEventListener('click', e => { const v = e.target.dataset && e.target.dataset.v; if (v !== undefined) { b.remove(); resolve(v === '1'); } });
    document.body.appendChild(b);
  });
};
