/* Merit Entertainment · etkinlik detay sayfası
   ?id=<etkinlik> parametresine göre sayfayı doldurur. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const money = new Intl.NumberFormat('tr-TR');
  const lira = value => '₺' + money.format(value);
  const events = window.MeritEvents ?? [];
  const params = new URLSearchParams(location.search);

  const PLACES = [
    { match: /Royal Diamond/i, address: 'Merit Royal Diamond Hotel &amp; Spa<br>Alsancak, Girne / KKTC', query: 'Merit Royal Diamond Hotel Alsancak Girne' },
    { match: /Crystal Cove/i, address: 'Merit Crystal Cove Hotel &amp; Casino<br>Alsancak, Girne / KKTC', query: 'Merit Crystal Cove Hotel Alsancak Girne' },
    { match: /Grand Mosta/i, address: 'Merit Grand Mosta Hotel &amp; Casino<br>Mosta, Bulgaristan', query: 'Merit Grand Mosta Hotel Bulgaria' },
    { match: /Park/i, address: 'Merit Park Hotel &amp; Casino<br>Alsancak, Girne / KKTC', query: 'Merit Park Hotel Alsancak Girne' },
    { match: /Lefko/i, address: 'Merit Lefkoşa Hotel &amp; Casino<br>Lefkoşa / KKTC', query: 'Merit Lefkosa Hotel Nicosia' },
    { match: /Starlit/i, address: 'Merit Starlit Hotel &amp; Casino<br>Budva, Karadağ', query: 'Merit Starlit Hotel Budva Montenegro' },
    { match: /Royal Hotel/i, address: 'Merit Royal Hotel &amp; Casino<br>Alsancak, Girne / KKTC', query: 'Merit Royal Hotel Alsancak Girne' }
  ];

  const TIERS = [
    { label: 'Salon masası', note: 'Sahne görüşü açık, 12 kişilik masa' },
    { label: 'Ön blok masa', note: 'Sahneye yakın blok' },
    { label: 'Sahne çevresi', note: 'Sahnenin hemen çevresi' },
    { label: 'Loca', note: '12 kişilik tam loca' }
  ];

  const event = events.find(item => item.id === params.get('id')) ??
    [...events].filter(item => !item.past).sort((a, b) => a.iso.localeCompare(b.iso))[0];

  if (!event) {
    location.replace('merit-etkinlikler.html');
    return;
  }

  const past = Boolean(event.past);
  const sold = Boolean(event.sold);
  const bookHref = 'merit-bilet.html?etkinlik=' + encodeURIComponent(event.id) + '&islem=' +
    (sold ? 'bekleme' : 'bilet');

  document.title = event.artist + ' · ' + event.short + ' | Merit Entertainment';
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute('content', event.artist + ', ' + event.date + ' · ' + event.venue + '. Program akışı, masa ve loca fiyatları, bilet bilgileri.');

  $('detail-label').textContent = event.label || 'Canlı konser';
  const title = $('detail-title');
  const breakAt = event.artist.lastIndexOf(' ');
  if (breakAt > 0) {
    const last = document.createElement('em');
    last.textContent = event.artist.slice(breakAt + 1);
    title.replaceChildren(event.artist.slice(0, breakAt), document.createElement('br'), last);
  } else {
    title.textContent = event.artist;
  }
  title.classList.toggle('long-artist', event.artist.length > 16);

  $('detail-date').textContent = event.date;
  $('detail-date').dateTime = event.iso;
  $('detail-venue').textContent = event.venue ?? 'Merit Royal Diamond Hotel';

  const art = $('detail-image');
  if (event.image) {
    art.src = 'assets/royal-demo/' + event.image;
    art.alt = event.artist + ' konser afişi';
    art.classList.add('poster-format');
  } else {
    art.alt = event.artist + ' sahne görüntüsü, temsili';
  }

  const bookingLinks = [$('detail-book'),$('mobile-buy-link')];
  if (!past) bookingLinks.push(document.querySelector('.header-cta'));
  for (const link of bookingLinks) {
    link.href = past ? 'merit-etkinlikler.html#program' : bookHref;
    if (past) link.textContent = 'Yaklaşan etkinlikler';
    else if (sold) link.textContent = 'Bekleme listesi';
  }

  if (sold) {
    $('detail-price').textContent = 'Biletler tükendi · Bekleme listesi açık';
  } else {
    $('detail-price').innerHTML = 'Başlangıç <strong>' + lira(event.prices[0]) + '</strong> / kişi · Vergiler dahil';
  }

  /* Gece hakkında */
  const about = $('detail-about');
  const intro = event.artist + ', ' + (event.venue ?? 'Merit Royal Diamond Hotel') + ' sahnesinde. ' +
    event.date + ' akşamı kapılar 20:00’de açılıyor, konser 21:30’da başlıyor.';
  const body = event.label === 'Yılbaşı konseri' || event.label === 'Yılbaşı galası'
    ? 'Program, yılın son gecesini sahnede karşılamak üzere kurgulanır: gala menüsü, sahne prodüksiyonu ve gece boyunca süren müzik aynı akış içinde ilerler.'
    : 'Geceyi Merit Entertainment prodüksiyonuyla sahneliyoruz: ışık ve ses tasarımı, sahne düzeni ve salon akışı birlikte planlanıyor. Masanızı 3B salon krokisinden seçebilir, loca katından salona bakışı görebilirsiniz.';
  about.textContent = intro + ' ' + body;

  /* Mekân */
  const place = PLACES.find(item => item.match.test(event.venue ?? '')) ?? PLACES[0];
  $('detail-address').innerHTML = place.address;
  $('detail-map').href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(place.query);

  /* Fiyat tablosu */
  const tbody = $('detail-prices').querySelector('tbody');
  event.prices.forEach((price, index) => {
    const tier = TIERS[index] ?? TIERS[TIERS.length - 1];
    const row = document.createElement('tr');
    const name = document.createElement('th');
    name.scope = 'row';
    name.textContent = tier.label;
    const note = document.createElement('td');
    note.textContent = tier.note;
    const amount = document.createElement('td');
    amount.className = 'price-cell';
    amount.textContent = index === 3 ? lira(price) + ' / loca' : lira(price);
    row.append(name, note, amount);
    tbody.append(row);
  });

  if (past) {
    const note = document.createElement('p');
    note.className = 'detail-note';
    note.textContent = 'Bu etkinlik tamamlandı. Arşivden görüntülere ana sayfadan ulaşabilirsiniz.';
    document.querySelector('.detail-block').after(note);
  }

  window.MeritUI?.event(event);
})();
