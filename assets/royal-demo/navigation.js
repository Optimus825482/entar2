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
  const resetMenu = () => setMenu(false);
  if (compact.addEventListener) compact.addEventListener('change', resetMenu);
  else compact.addListener(resetMenu);

  button.addEventListener('click', () => setMenu(nav.hidden));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && compact.matches && !nav.hidden &&
        !event.defaultPrevented && !document.querySelector('dialog[open]')) {
      setMenu(false);
      button.focus();
    }
  });
})();
