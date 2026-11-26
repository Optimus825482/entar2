(() => {
  const header = document.querySelector('.masthead');
  const button = header.querySelector('.menu-trigger');
  const nav = document.getElementById('site-navigation');
  const compact = matchMedia('(max-width: 800px)');
  function setMenu(open) {
    button.hidden = !compact.matches;
    button.setAttribute('aria-expanded', String(open));
    nav.hidden = compact.matches && !open;
  }
  setMenu(false);
  compact.addEventListener('change', () => setMenu(false));
  button.addEventListener('click', () => setMenu(nav.hidden));
  header.addEventListener('keydown', event => {
    if (event.key === 'Escape' && compact.matches && !nav.hidden) {
      setMenu(false);
      button.focus();
    }
  });
})();
