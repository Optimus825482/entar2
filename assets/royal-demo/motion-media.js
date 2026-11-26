/* Merit Entertainment · otomatik medya
   Kart görselleri ekrana girdiğinde animasyon kendiliğinden başlar.
   Buton yok. Görünür kartlar arasında tek bir zamanlayıcı sırayla döner,
   böylece aynı anda tek animasyon oynar ve işlemci yorulmaz. */
(() => {
  'use strict';
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const containers = new Set();
  let pool = [];
  let onScreen = new Set();
  let cursor = -1;
  let timer = null;
  let hovered = null;
  let active = null;
  const period = 4800;

  function stopActive() {
    if (!active) return;
    active.stop();
    active = null;
  }

  function makePlayer(image) {
    const clip = image.dataset.clip;
    if (!clip) return null;
    const still = image.dataset.still || image.currentSrc || image.src;
    if (!still || clip === still) return null;

    const player = {
      image,
      still,
      clip,
      ready: image.classList.contains('is-moving'),
      pending: null,
      play() {
        if (active === player) return;
        stopActive();
        active = player;
        if (player.ready) {
          image.classList.add('is-moving');
          if (!image.src.endsWith(clip)) image.src = clip;
          return;
        }
        if (player.pending) return;
        // Animasyon hazır olmadan kaynağı değiştirme: kart bir an boş görünmesin.
        const loader = new Image();
        loader.decoding = 'async';
        loader.onload = () => {
          player.pending = null;
          player.ready = true;
          if (active !== player) return;
          image.classList.add('is-moving');
          image.src = clip;
        };
        loader.onerror = () => {
          player.pending = null;
          if (active === player) active = null;
        };
        player.pending = loader;
        loader.src = clip;
      },
      stop() {
        if (active !== player && !image.classList.contains('is-moving')) return;
        image.classList.remove('is-moving');
        if (player.ready) image.src = still;
        if (active === player) active = null;
      },
      wake() {
        if (image.loading === 'lazy') image.loading = 'eager';
      }
    };
    image.addEventListener('error', () => player.stop());
    return player;
  }

  function schedule(delay) {
    clearTimeout(timer);
    timer = setTimeout(tick, delay ?? period);
  }

  function tick() {
    timer = null;
    if (document.hidden) return;
    if (hovered) {
      hovered.play();
      schedule(period);
      return;
    }
    if (!onScreen.size) {
      stopActive();
      return;
    }
    let guard = 0;
    do {
      cursor = (cursor + 1) % pool.length;
      guard += 1;
    } while (!onScreen.has(pool[cursor]) && guard <= pool.length);
    if (onScreen.has(pool[cursor])) pool[cursor].play();
    schedule(period);
  }

  const seen = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const player = entry.target.__meritPlayer;
      if (!player) continue;
      if (entry.intersectionRatio >= 0.45) {
        onScreen.add(player);
        player.wake();
      } else {
        onScreen.delete(player);
        if (active === player) player.stop();
      }
    }
    if (!timer) tick();
  }, { threshold: [0, 0.45] });

  /* Kart listesi her yenilendiğinde (filtre, sekme değişimi) yeniden bağlan. */
  function observe(container) {
    if (!container) return;
    containers.add(container);
    refresh();
  }

  function refresh() {
    if (reduceMotion.matches) return;
    seen.disconnect();
    pool = [];
    onScreen = new Set();
    cursor = -1;

    for (const container of containers) {
      for (const image of container.querySelectorAll('img[data-clip]')) {
        const player = makePlayer(image);
        if (!player) continue;
        image.__meritPlayer = player;
        pool.push(player);
        seen.observe(image);
        if (!image.dataset.meritBound) {
          image.dataset.meritBound = '1';
          image.addEventListener('pointerenter', () => {
            hovered = player;
            player.play();
          });
          image.addEventListener('pointerleave', () => {
            if (hovered === player) hovered = null;
            player.stop();
            schedule(period);
          });
        }
      }
    }
    if (!timer) tick();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearTimeout(timer);
      timer = null;
      stopActive();
    } else if (!timer) {
      tick();
    }
  });

  function onMotionChange(event) {
    if (event.matches) {
      clearTimeout(timer);
      timer = null;
      stopActive();
    } else {
      refresh();
    }
  }
  if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', onMotionChange);
  else reduceMotion.addListener(onMotionChange);

  window.MeritMotion = { observe, refresh };
})();
