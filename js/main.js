// Atena Lab — menú del celular y año del pie
(() => {
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.getElementById('menu');
  const close = () => { menu.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); };

  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  document.getElementById('year').textContent = new Date().getFullYear();
})();
