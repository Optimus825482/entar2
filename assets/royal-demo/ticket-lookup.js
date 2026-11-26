/* Merit Entertainment · bilet sorgulama
   PNR numarası veya telefon numarasının son 10 hanesiyle saklı biletleri bulur.
   Biletler bu tarayıcıda (localStorage) tutulur; sunucu yoktur. */
(() => {
  'use strict';
  const KEY = 'merit:tickets:v1';
  const $ = id => document.getElementById(id);
  const money = new Intl.NumberFormat('tr-TR');
  const lira = value => '₺' + money.format(value || 0);

  const form = $('lookup-form');
  const input = $('lookup-input');
  const error = $('lookup-error');
  const results = $('lookup-results');
  let qrLoading = null;

  function read() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  }

  function normalizePnr(value) {
    const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!clean) return '';
    return clean.startsWith('MR') ? 'MR-' + clean.slice(2) : clean;
  }

  function phoneKey(value) {
    const digits = (value || '').replace(/\D/g, '');
    return digits.length >= 10 ? digits.slice(-10) : '';
  }

  function loadQr() {
    if (window.meritQr) return Promise.resolve();
    if (!qrLoading) {
      qrLoading = new Promise((resolve, reject) => {
        const tag = document.createElement('script');
        tag.src = 'assets/royal-demo/qr-local.js';
        tag.onload = resolve;
        tag.onerror = reject;
        document.head.append(tag);
      });
    }
    return qrLoading;
  }

  function chairsText(ticket) {
    if (ticket.box) return 'Locanın tamamı';
    return Array.isArray(ticket.chairs) && ticket.chairs.length ? ticket.chairs.join(', ') : '—';
  }

  function ticketCard(ticket) {
    const article = document.createElement('article');
    article.className = 'ticket-result';

    const head = document.createElement('div');
    head.className = 'tr-head';
    const eyebrow = document.createElement('p');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = 'E-BİLET · DEMO';
    const title = document.createElement('h3');
    title.textContent = ticket.artist || 'Merit Entertainment';
    const meta = document.createElement('p');
    meta.className = 'tr-meta';
    meta.textContent = (ticket.date || '') + ' · ' + (ticket.venue || '');
    head.append(eyebrow, title, meta);

    const grid = document.createElement('dl');
    grid.className = 'tr-grid';
    const rows = [
      ['Masa / loca', ticket.unit || '—'],
      ['Kişi sayısı', (ticket.count || 0) + ' kişi'],
      ['Sandalyeler', chairsText(ticket)],
      ['Bilet sahibi', ticket.name || '—'],
      ['Telefon', ticket.phone || '—'],
      ['Toplam', lira(ticket.total)]
    ];
    for (const [label, value] of rows) {
      const wrap = document.createElement('div');
      const dt = document.createElement('dt');
      dt.textContent = label;
      const dd = document.createElement('dd');
      dd.textContent = value;
      if (label === 'Toplam') dd.className = 'tr-total';
      wrap.append(dt, dd);
      grid.append(wrap);
    }

    const code = document.createElement('div');
    code.className = 'tr-code';
    const codeLabel = document.createElement('span');
    codeLabel.textContent = 'PNR';
    const codeValue = document.createElement('strong');
    codeValue.textContent = ticket.code || '—';
    code.append(codeLabel, codeValue);

    const qr = document.createElement('img');
    qr.className = 'tr-qr';
    qr.width = 96;
    qr.height = 96;
    qr.alt = 'Bilet ' + (ticket.code || '') + ' için QR kodu';
    qr.hidden = true;

    const actions = document.createElement('div');
    actions.className = 'tr-actions';
    const print = document.createElement('button');
    print.type = 'button';
    print.className = 'btn secondary';
    print.textContent = 'Bileti yazdır';
    print.addEventListener('click', () => window.print());
    const seat = document.createElement('a');
    seat.className = 'btn primary';
    seat.textContent = 'Etkinliği gör';
    seat.href = 'merit-etkinlik.html?id=' + encodeURIComponent(ticket.eventId || '');
    actions.append(seat, print);

    const side = document.createElement('div');
    side.className = 'tr-side';
    side.append(code, qr);

    article.append(head, grid, side, actions);

    loadQr().then(() => {
      if (!window.meritQr) return;
      qr.src = window.meritQr('MERIT-SAMPLE|' + (ticket.eventId || '') + '|' + (ticket.code || ''));
      qr.hidden = false;
    }).catch(() => {});

    return article;
  }

  function message(text, hint) {
    const box = document.createElement('div');
    box.className = 'lookup-empty';
    const title = document.createElement('p');
    title.textContent = text;
    box.append(title);
    if (hint) {
      const link = document.createElement('a');
      link.className = 'btn secondary';
      link.href = 'merit-etkinlikler.html';
      link.textContent = 'Etkinliklere göz at';
      box.append(link);
    }
    return box;
  }

  function run(value) {
    const pnr = normalizePnr(value);
    const key = phoneKey(value);
    const all = read();

    if (!pnr && !key) {
      error.hidden = false;
      error.textContent = 'Bir PNR numarası ya da en az 10 haneli telefon numarası girin.';
      return;
    }
    error.hidden = true;

    const matches = all.filter(ticket =>
      (pnr && normalizePnr(ticket.code || '') === pnr) ||
      (key && (ticket.phoneKey || phoneKey(ticket.phone)) === key)
    );

    results.replaceChildren();
    if (!matches.length) {
      results.append(all.length
        ? message('Bu bilgilerle eşleşen bilet bulunamadı. PNR numarasını veya telefonun son 10 hanesini kontrol edin.', true)
        : message('Bu tarayıcıda kayıtlı bilet yok. Bilet aldığınızda burada listelenir.', true));
      return;
    }

    const heading = document.createElement('p');
    heading.className = 'lookup-count';
    heading.textContent = matches.length + ' bilet bulundu';
    results.append(heading, ...matches.map(ticketCard));
    window.MeritUI?.toast(matches.length + ' bilet listelendi.');
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    run(input.value);
  });

  /* Bağlantıdan gelen sorgu: ?pnr=... */
  const preset = new URLSearchParams(location.search).get('pnr');
  if (preset) {
    input.value = preset;
    run(preset);
  }
})();
