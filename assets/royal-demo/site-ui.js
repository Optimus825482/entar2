/* Merit Entertainment · arayüz katmanı
   Yapışkan başlık, okuma ilerlemesi, geri sayım, takvime ekleme,
   paylaşım, bülten, bildirim ve kaydırma animasyonları. */
(() => {
  'use strict';
  const doc = document;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const TIMEZONE = 'Europe/Istanbul';

  /* ---------------- Bildirim ---------------- */
  let toastTimer;
  function toast(message) {
    const region = doc.getElementById('toast-region');
    if (!region) return;
    let node = region.firstElementChild;
    if (!node) {
      node = doc.createElement('div');
      node.className = 'toast';
      region.append(node);
    }
    node.textContent = message;
    void node.offsetWidth;
    node.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove('is-visible'), 3800);
  }

  /* ---------------- Başlık, ilerleme, başa dön ---------------- */
  const header = doc.getElementById('masthead') || doc.querySelector('.masthead');
  const progress = doc.getElementById('scroll-progress-bar');
  const toTop = doc.getElementById('to-top');
  let frame = 0;

  function onScroll() {
    frame = 0;
    const y = window.scrollY;
    header?.classList.toggle('is-stuck', y > 24);
    toTop?.classList.toggle('is-visible', y > 720);
    if (progress) {
      const max = doc.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';
    }
  }
  function queueScroll() {
    if (!frame) frame = requestAnimationFrame(onScroll);
  }
  addEventListener('scroll', queueScroll, { passive: true });
  addEventListener('resize', queueScroll);
  onScroll();

  toTop?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    doc.getElementById('salon-title')?.blur();
  });

  /* ---------------- Kaydırma animasyonları ---------------- */
  const revealables = [...doc.querySelectorAll('[data-reveal]')];
  if (revealables.length) {
    if (!reduceMotion.matches && 'IntersectionObserver' in window) {
      doc.documentElement.classList.add('js-reveal');
      const observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
          // Görünür olan ya da yukarıda kalıp atlanan bölümleri aç.
          if (!entry.isIntersecting && entry.boundingClientRect.top > 0) continue;
          entry.target.classList.add('is-in');
          observer.unobserve(entry.target);
        }
      }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });
      revealables.forEach(node => observer.observe(node));
    } else {
      revealables.forEach(node => node.classList.add('is-in'));
    }
  }

  /* ---------------- Geri sayım ---------------- */
  let target = null;
  let ticker = null;
  const countdown = doc.querySelector('[data-countdown]');

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function paintCountdown() {
    if (!countdown || !target) return;
    const diff = target.getTime() - Date.now();
    if (diff <= 0) {
      countdown.hidden = true;
      clearInterval(ticker);
      ticker = null;
      return;
    }
    const seconds = Math.floor(diff / 1000);
    const parts = {
      days: Math.floor(seconds / 86400),
      hours: Math.floor((seconds % 86400) / 3600),
      minutes: Math.floor((seconds % 3600) / 60),
      seconds: seconds % 60
    };
    for (const [key, value] of Object.entries(parts)) {
      const node = countdown.querySelector('[data-cd="' + key + '"]');
      if (node) node.textContent = key === 'days' ? String(value) : pad(value);
    }
    const sr = countdown.querySelector('[data-cd-text]');
    if (sr) {
      sr.textContent = parts.days > 0
        ? 'Konsere ' + parts.days + ' gün kaldı.'
        : 'Konser bugün başlıyor.';
    }
    countdown.hidden = false;
  }

  /* ---------------- Takvime ekle ---------------- */
  let current = null;

  function isoStamp(iso, time) {
    return iso.replaceAll('-', '') + 'T' + time.replace(':', '') + '00';
  }

  function icsText(event) {
    const start = isoStamp(event.iso, '2130');
    const end = isoStamp(event.iso, '2330');
    const place = (event.venue || 'Merit Royal Diamond Hotel') + ', Alsancak, Girne, KKTC';
    const link = location.origin + location.pathname + '?etkinlik=' + encodeURIComponent(event.id);
    const escape = value => String(value).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Merit Entertainment//Bilet//TR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:' + event.id + '-' + event.iso + '@meritentertainment',
      'DTSTAMP:' + start + 'Z',
      'DTSTART;TZID=' + TIMEZONE + ':' + start,
      'DTEND;TZID=' + TIMEZONE + ':' + end,
      'SUMMARY:' + escape(event.artist + ' · ' + (event.label || 'Konser')),
      'LOCATION:' + escape(place),
      'DESCRIPTION:' + escape('Merit Entertainment konser gecesi. Bilet ve masa seçimi: ' + link),
      'URL:' + link,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
  }

  function downloadCalendar() {
    if (!current) return;
    try {
      const blob = new Blob([icsText(current)], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = doc.createElement('a');
      link.href = url;
      link.download = 'merit-' + current.id + '.ics';
      doc.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      toast('Takvim dosyası indirildi.');
    } catch {
      toast('Takvim dosyası oluşturulamadı.');
    }
  }

  /* ---------------- Fiyat aynası (mobil çubuk) ---------------- */
  const priceLine = doc.getElementById('hero-price-line');
  const priceMirror = doc.querySelector('[data-price-mirror]');

  function mirrorPrice() {
    if (!priceLine || !priceMirror) return;
    const strong = doc.getElementById('hero-price');
    priceMirror.textContent = strong ? strong.textContent : priceLine.textContent;
  }

  if (priceLine && priceMirror && 'MutationObserver' in window) {
    new MutationObserver(mirrorPrice).observe(priceLine, {
      childList: true, characterData: true, subtree: true
    });
    mirrorPrice();
  }

  /* ---------------- Bülten ---------------- */
  const newsletter = doc.getElementById('newsletter-form');
  newsletter?.addEventListener('submit', event => {
    event.preventDefault();
    const input = newsletter.querySelector('input[type="email"]');
    const value = (input?.value || '').trim();
    if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      input?.focus();
      toast('Geçerli bir e-posta adresi girin.');
      return;
    }
    newsletter.reset();
    toast('Teşekkürler! Yeni sezon programını e-posta ile paylaşacağız.');
  });

  /* ---------------- Olay bağlama ---------------- */
  doc.addEventListener('click', event => {
    const ics = event.target.closest('[data-ics]');
    if (ics) { downloadCalendar(); return; }
    const share = event.target.closest('[data-share]');
    if (share) window.MeritShare?.open(current);
  });

  /* ---------------- Dışa açılan API ---------------- */
  function setEvent(event) {
    if (!event || !event.iso) return;
    current = event;

    target = new Date(event.iso + 'T21:30:00+03:00');
    paintCountdown();
    if (!ticker && countdown) ticker = setInterval(paintCountdown, 1000);

    for (const button of doc.querySelectorAll('[data-ics],[data-share]')) {
      button.hidden = false;
    }
    mirrorPrice();
  }

  window.MeritUI = { event: setEvent, toast, price: mirrorPrice };
})();
