/* Merit Entertainment · Hakkımızda sanatçı galerisi */
(() => {
  'use strict';
  const stage = document.getElementById('story-stage');
  if (!stage) return;

  const layerA = document.getElementById('story-layer-a');
  const layerB = document.getElementById('story-layer-b');
  const nameNode = document.getElementById('story-name');
  const venueNode = document.getElementById('story-venue');
  const controls = document.getElementById('story-controls');
  const dotsNode = document.getElementById('story-dots');
  const toggle = document.getElementById('story-toggle');
  const root = 'assets/royal-demo/';

  const archive = Array.isArray(window.MeritArchive) ? window.MeritArchive : [];
  const items = ['sibelcan', 'nukhet-duru', 'ebru-yasar', 'ziynet-sali',
    'fettahcan', 'ozcan-deniz', 'assi-el-hallani-2', 'sahin-kendirci']
    .map(id => archive.find(item => item.id === id))
    .filter(Boolean)
    .map(item => ({
      src: item.still,
      name: item.artist,
      venue: item.venue + (item.tag ? ' · ' + item.tag : '')
    }));

  if (items.length < 2) return;

  const period = 4500;
  let nextIndex = 1;
  let request = 0;
  let active = layerA;
  let timer;
  let playing = true;

  async function show(index, automatic = false) {
    const currentRequest = ++request;
    const item = items[index];
    const src = root + item.src;
    if (active.getAttribute('src') === src) {
      nextIndex = (index + 1) % items.length;
      return;
    }

    const incoming = active === layerA ? layerB : layerA;
    incoming.src = src;
    const loaded = await incoming.decode().then(() => true, () => false);
    if (currentRequest !== request || (automatic && (!playing || document.hidden))) return;
    nextIndex = (index + 1) % items.length;
    if (!loaded) return;

    incoming.alt = item.name + ', ' + item.venue;
    incoming.removeAttribute('aria-hidden');
    incoming.classList.add('is-active');
    active.setAttribute('aria-hidden', 'true');
    active.classList.remove('is-active');
    active = incoming;
    nameNode.textContent = item.name;
    venueNode.textContent = item.venue;
    dots.forEach((dot, i) => dot.setAttribute('aria-current', String(i === index)));
  }

  function syncTimer() {
    clearTimeout(timer);
    if (playing && !document.hidden && !dotsNode.matches(':focus-within')) {
      timer = setTimeout(async () => {
        await show(nextIndex, true);
        syncTimer();
      }, period);
    }
  }

  function updateToggle() {
    const action = playing ? 'Görsel geçişlerini duraklat' : 'Görsel geçişlerini başlat';
    toggle.setAttribute('aria-label', action);
    toggle.title = action;
    toggle.firstElementChild.textContent = playing ? 'Ⅱ' : '▶';
    syncTimer();
  }

  const dots = items.map((item, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-current', String(i === 0));
    dot.setAttribute('aria-label', item.name + ', ' + item.venue + ' görselini göster');
    dot.addEventListener('click', async () => {
      clearTimeout(timer);
      await show(i);
      syncTimer();
    });
    return dot;
  });
  dotsNode.append(...dots);
  controls.hidden = false;

  dotsNode.addEventListener('focusin', syncTimer);
  dotsNode.addEventListener('focusout', () => queueMicrotask(syncTimer));
  document.addEventListener('visibilitychange', syncTimer);
  toggle.addEventListener('click', () => {
    playing = !playing;
    updateToggle();
  });
  updateToggle();
})();
