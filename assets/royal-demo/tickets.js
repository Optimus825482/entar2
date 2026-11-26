(() => {
  'use strict';
  const assets = 'assets/royal-demo/';
  const $ = id => document.getElementById(id);
  const format = new Intl.NumberFormat('tr-TR');
  const money = value => '₺' + format.format(value);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const events = window.MeritEvents;
  const params = new URLSearchParams(location.search);
  const requestedEvent = events.find(event => event.id === params.get('etkinlik'));
  const featured = events.find(event => event.id === 'levent' && !event.past) ??
    [...events].filter(event => !event.past).sort((a,b) => a.iso.localeCompare(b.iso))[0] ?? events[0];
  if (params.has('etkinlik') && (!requestedEvent || requestedEvent.past)) {
    location.replace('merit-etkinlikler.html#program');
    return;
  }
  if (!requestedEvent && !events.some(event => !event.past)) {
    location.replace('merit-etkinlikler.html');
    return;
  }
  const active = requestedEvent ?? featured;
  const bookingClosed = Boolean(active.past || active.sold);
  const hasVenueSightlines = /\bRoyal Diamond\b/i.test(active.venue ?? '');
  const plan = window.MeritPlan;
  const geometry = plan.geometry ?? {
    width:64, front:-22, back:20, balcony:23,
    stage:[0,-15.9,17.4,8.5], runway:[0,-7.9,2.7,8], apron:[0,-3.15,10.6,2.7]
  };
  // Older cached plans provide the table centers and box names without precomputed units.
  const planUnits = plan.units ?? [
    ...plan.tables.map(([num,x,z]) => ({id:'M-' + num,num,label:'Masa ' + num,x:x*28.7,y:0,z:z*18.9})),
    ...plan.boxes.map((num,index) => ({id:'L-' + num,num,label:'Loca ' + num,x:(index-5.5)*4.97,y:4.35,z:21.18,box:true}))
  ];
  const allChairs = Array.from({length:12}, (_, index) => index + 1);
  const reservedTables = new Set([35,36,38,39,50,52,64,65]);
  const availableBoxes = new Set(['9A','8','6','4','3A','1']);
  const stageRate = 2;
  const stageTables = new Set(plan.stageTables);
  const units = planUnits.map(item => {
    if (item.box) return {...item,rate:3,reserved:!availableBoxes.has(item.num)};
    const stageSide = stageTables.has(item.num);
    return {...item,stageSide,rate:stageSide ? stageRate : (item.z < .28*18.9 ? 1 : 0),reserved:reservedTables.has(item.num)};
  });
  const unitById = new Map(units.map(item => [item.id,item]));
  const purchased = new Map();
  const scriptLoads = new Map();
  const steps = [...document.querySelectorAll('.steps li')];
  let unit = null;
  let located = null;
  let partySize = null;
  const selected = new Set();
  let stock;
  let hall;
  let hallPromise;
  let viewMode = 'overview';
  let viewpoint = null;
  let pendingOrder;
  let lastTicket;
  let waitEntry;

  function script(file) {
    if (!scriptLoads.has(file)) {
      scriptLoads.set(file,new Promise((resolve,reject) => {
        const tag = document.createElement('script');
        tag.src = assets + file;
        tag.onload = resolve;
        tag.onerror = reject;
        document.head.append(tag);
      }));
    }
    return scriptLoads.get(file);
  }

  function announce(message) { $('status').textContent = message; }

  function setStep(step) {
    steps.forEach((item,index) => {
      if (index+1 === step) item.setAttribute('aria-current','step');
      else item.removeAttribute('aria-current');
    });
  }

  function createStock() {
    stock = new Map(units.map((item,index) => {
      const unavailable = bookingClosed || item.reserved || (!item.box && item.num%23 === 0);
      const sold = purchased.get(item.id);
      const free = unavailable ? [] : allChairs.filter(number => {
        const initiallySold = !item.box && item.num%8 !== 0 && (number*17+index*13+active.seed)%19 < 5;
        return !initiallySold && !sold?.has(number);
      });
      return [item.id,free];
    }));
  }

  function canPick(item) {
    if (!item) return false;
    const free = stock.get(item.id).length;
    if (item.box) return free === allChairs.length;
    return free >= (partySize ?? 1);
  }

  function stateOf(item) {
    if (item.reserved) return 'Ayrılmış';
    const free = stock.get(item.id).length;
    if (!free) return 'Dolu';
    if (item.box) return canPick(item) ? 'Tam loca · 12 kişilik · Müsait' : 'Dolu';
    if (!canPick(item)) return free + ' boş · Grubunuza yetmiyor';
    return free + ' boş sandalye';
  }

  function unitPrice(item) { return active.prices[item.rate]; }

  const sightlineImage = $('sightline-photo');
  const sightlineStatus = $('sightline-status');
  sightlineImage.addEventListener('load', () => {
    if (!hasVenueSightlines) return;
    sightlineImage.hidden = false;
    if (sightlineStatus) sightlineStatus.hidden = true;
  });
  sightlineImage.addEventListener('error', () => {
    if (hasVenueSightlines) showSightlineStatus('Bu konumun sahne görseli yüklenemedi.');
  });

  function showSightlineStatus(message) {
    if (!sightlineStatus) return;
    sightlineImage.hidden = true;
    sightlineStatus.textContent = message;
    sightlineStatus.hidden = false;
  }

  function updateSightline(item) {
    if (!hasVenueSightlines) {
      sightlineImage.hidden = true;
      sightlineImage.removeAttribute('src');
      $('sightline-caption').textContent = 'Masa görüşü';
      showSightlineStatus((active.venue ?? 'Bu mekân') + ' için masaya özel sahne görüşü mevcut değil.');
      return;
    }
    const label = item ? item.label + ' · Sahne görüşü' : 'Salon ortasından sahne görüşü';
    $('sightline-caption').textContent = label;
    sightlineImage.alt = label;
    const src = assets + 'sightlines/' + (item?.id ?? 'overview') + '.webp?v=3';
    if (sightlineImage.getAttribute('src') === src) return;
    showSightlineStatus('Sahne görseli yükleniyor…');
    sightlineImage.src = src;
  }

  function updateEvent() {
    window.MeritUI?.event(active);
    const detailLink = $('hero-detail');
    if (detailLink) detailLink.href = 'merit-etkinlik.html?id=' + encodeURIComponent(active.id);
    $('booking-event').textContent = active.artist + ' · ' + active.short;
    $('hero-venue').textContent = active.venue ?? 'Merit Royal Diamond Hotel';
    if (!hasVenueSightlines) {
      $('map-title').textContent = 'Royal Diamond · Örnek kroki';
      $('view-seat').textContent = 'Örnek 3B göz hizasını aç';
      const qualifier = $('sightline-qualifier');
      if (qualifier) qualifier.hidden = true;
      if (!sightlineStatus) sightlineImage.closest('figure').hidden = true;
    }
    if (!bookingClosed) $('stage-legend').textContent = 'Sahne çevresi · ' + money(active.prices[stageRate]) + ' / kişi';
    if (active.id !== 'levent') {
      const title = $('hero-title');
      const breakAt = active.artist.lastIndexOf(' ');
      if (breakAt > 0) {
        const last = document.createElement('em');
        last.textContent = active.artist.slice(breakAt+1);
        title.replaceChildren(active.artist.slice(0,breakAt),document.createElement('br'),last);
      } else title.textContent = active.artist;
      title.classList.toggle('long-artist',active.artist.length > 16);
      $('hero-date').textContent = active.date;
      $('hero-date').dateTime = active.iso;
      $('event-type').textContent = active.label;
      const image = $('hero-image');
      image.src = assets + (active.image ?? 'view-rear.webp');
      image.alt = active.image ? active.artist + ' konser afişi' : '';
      image.classList.toggle('poster-hero',Boolean(active.image));
      if (!active.image && active.posterScript) {
        script(active.posterScript).then(() => {
          if (!window.meritHallArtwork?.src) return;
          image.src = window.meritHallArtwork.src;
          image.alt = active.artist + ' konser afişi';
          image.classList.add('poster-hero');
        }).catch(() => {});
      }
    }

    if (!bookingClosed) {
      $('hero-price').textContent = money(active.prices[0]);
      return;
    }
    $('hero-price-line').textContent = 'Biletler tükendi';
    $('unit-sub').textContent = 'Masa satışı kapalı.';
    document.querySelectorAll('[data-buy]').forEach(button => {
      button.textContent = 'Bekleme listesi';
    });
  }

  function fillUnitOptions() {
    const placeholder = new Option('Masa veya loca seç','');
    placeholder.disabled = true;
    $('unit').replaceChildren(placeholder,...units.map(item => {
      const option = new Option(item.label + ' · ' + stateOf(item),item.id);
      option.disabled = !canPick(item);
      return option;
    }));
    $('unit').value = unit?.id ?? '';
    $('unit').disabled = bookingClosed;
  }

  function buildChairs() {
    $('unit-details').hidden = !unit;
    $('manual-seats').hidden = partySize !== null;
    if (!unit || partySize !== null) { $('chairs').replaceChildren(); return; }
    const free = stock.get(unit.id);
    $('seat-title').textContent = unit.box ? 'Loca rezervasyonu' : 'Sandalyeler';
    $('select-all').hidden = Boolean(unit.box);
    const buttons = (unit.box ? [0] : allChairs).map(number => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.chair = number;
      button.classList.toggle('box-choice',Boolean(unit.box));
      button.disabled = !canPick(unit) || (!unit.box && !free.includes(number));
      button.textContent = unit.box ? 'Locanın tamamını seç · 12 kişi' : String(number);
      button.setAttribute('aria-label', unit.box ? button.textContent : 'Sandalye ' + number + (button.disabled ? ' dolu' : ''));
      return button;
    });
    $('chairs').replaceChildren(...buttons);
  }

  function assignGroupSeats() {
    if (!unit || partySize === null) return;
    const free = stock.get(unit.id);
    if (unit.box) {
      free.forEach(number => selected.add(number));
      return;
    }
    const circular = [...free,...free.map(number => number + allChairs.length)];
    let start = 0;
    let shortestSpan = Infinity;
    // Minimize the span around a round table, including the 12-to-1 boundary.
    for (let index=0; index<free.length; index++) {
      const span = circular[index+partySize-1] - circular[index];
      if (span < shortestSpan) {
        start = index;
        shortestSpan = span;
      }
    }
    circular.slice(start,start+partySize).forEach(number => selected.add((number-1)%allChairs.length+1));
  }

  function highlight(item) {
    if (item && !canPick(item)) return;
    located = null;
    if (item !== unit || partySize !== null) selected.clear();
    unit = item;
    assignGroupSeats();
    $('unit-title').textContent = item?.label ?? 'Sahne görüşü';
    $('unit-sub').textContent = item ? stateOf(item) : 'Görüş açısını görmek için bir masa seç.';
    $('unit').value = item?.id ?? '';
    updateSightline(item);
    buildChairs();
    updateSelection();
    if (item?.box && partySize !== null) announce(item.label + ' tam loca olarak seçildi. Ödemeye geçebilirsin.');
    else if (item) announce(partySize === null ? item.label + ', ' + stateOf(item) + '.' : item.label + ', ' + partySize + ' kişi için seçildi. Ödemeye geçebilirsin.');
  }

  function pickOnMap(id) {
    const item = unitById.get(id);
    if (canPick(item)) highlight(item);
  }

  function toggleChair(number) {
    if (partySize !== null || !canPick(unit)) return;
    if (unit.box) {
      if (selected.size) selected.clear();
      else allChairs.forEach(chair => selected.add(chair));
    } else {
      if (!stock.get(unit.id).includes(number)) return;
      if (selected.has(number)) selected.delete(number);
      else selected.add(number);
    }
    updateSelection(true);
  }

  function totalPrice() {
    return unit ? unitPrice(unit) * (unit.box ? Number(selected.size === allChairs.length) : selected.size) : 0;
  }

  function updateSelection(speak = false) {
    if (unit) {
      $('chairs').querySelectorAll('button').forEach(button => {
        const number = Number(button.dataset.chair);
        button.setAttribute('aria-pressed',String(unit.box ? selected.size > 0 : selected.has(number)));
      });
      $('select-all').textContent = selected.size ? 'Seçimi temizle' : 'Tüm boşları seç';
      $('unit-price-label').textContent = unit.box ? 'Tam loca' : 'Kişi başı';
      $('unit-price').textContent = money(unitPrice(unit));
    }
    const selectionLabel = unit?.box ? 'Tam loca' : selected.size + ' kişi';
    $('selection-label').textContent = selected.size ? selectionLabel + ' · Toplam' : 'Toplam';
    $('total').textContent = money(totalPrice());
    const selectionReady = unit?.box ? selected.size === allChairs.length
      : selected.size > 0 && (partySize === null || selected.size === partySize);
    $('pay').disabled = !canPick(unit) || !selectionReady;
    $('map-seats-link').hidden = !unit;
    if (speak && unit.box) announce(selected.size ? unit.label + ' tam loca olarak seçildi. Toplam ' + money(totalPrice()) + '.' : 'Loca seçimi temizlendi.');
    else if (speak) announce(unit.label + ', ' + selected.size + ' sandalye seçili. Toplam ' + money(totalPrice()) + '.');
    syncHall();
  }

  function syncHall() {
    const overlay = $('map-overlay');
    const cameraLocation = viewMode === 'ticket' ? located : viewpoint;
    overlay.hidden = !cameraLocation;
    if (cameraLocation) {
      const perspective = hasVenueSightlines ? 'Göz hizası' : 'Örnek göz hizası';
      overlay.textContent = viewMode === 'ticket' ? 'Biletin · ' + cameraLocation.label : cameraLocation.label + ' · ' + perspective;
    }
    hall?.sync({unit,located,selected,stock,canPick,manualSeats:partySize === null});
  }

  function showTooltip(item,x,y) {
    const tooltip = $('map-tooltip');
    if (!item) { tooltip.hidden = true; return; }
    tooltip.textContent = item.label + (item.stageSide ? ' · Sahne çevresi' : '') + ' · ' + stateOf(item);
    tooltip.hidden = false;
    tooltip.style.left = Math.max(6,Math.min(x+9,$('viewport').clientWidth-tooltip.offsetWidth-6)) + 'px';
    tooltip.style.top = Math.max(5,y-38) + 'px';
  }

  function hallUnavailable() {
    hall = null;
    $('hall').hidden = true;
    $('cam-bar').hidden = true;
    $('map-overlay').hidden = true;
    $('map-message').hidden = false;
    $('map-message').textContent = '3B görünüm şu anda kullanılamıyor. Listeden masa ve sandalye seçebilirsin.';
    $('map-hint').hidden = true;
    $('view-seat').disabled = true;
    announce($('map-message').textContent);
  }

  function ensureHall() {
    if (hallPromise) return hallPromise;
    hallPromise = Promise.all([
      script('three-local.js'),
      script('hall-logo.js').catch(() => {}),
      script(active.posterScript ?? 'hall-portraits.js').catch(() => {})
    ]).then(() => script('hall.js')).then(() => {
      hall = window.createMeritHall($('hall'),units,geometry,active,{
        unit:pickOnMap,chair:toggleChair,tooltip:showTooltip,reducedMotion,failure:hallUnavailable
      });
      $('hall').hidden = false;
      $('map-message').hidden = true;
      $('cam-bar').hidden = false;
      hall.visible(true);
      hall.camera('overview');
      syncHall();
    }).catch(hallUnavailable);
    return hallPromise;
  }

  function scrollBooking() {
    $('salon-title').focus({preventScroll:true});
    $('salon').scrollIntoView({block:'start'});
    ensureHall();
  }

  function openParty() {
    if (active.sold) { openWaitlist(active); return; }
    $('party-event').textContent = active.artist + ' · ' + active.short;
    $('party-count').value = String(partySize ?? 2);
    $('party').showModal();
  }

  function submitParty(event) {
    event.preventDefault();
    const count = Number($('party-count').value);
    if (!allChairs.includes(count)) return;
    partySize = count;
    selected.clear();
    located = null;
    viewMode = 'overview';
    viewpoint = null;
    $('change-party').hidden = false;
    const keptBox = unit?.box && canPick(unit) ? unit : null;
    fillUnitOptions();
    highlight(keptBox);
    $('party').close();
    $('salon').hidden = false;
    scrollBooking();
    hall?.camera('overview');
    if (!keptBox) announce(count + ' kişiye uygun masalar ve müsait localar gösteriliyor.');
  }

  function orderCode() {
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    return 'MR-' + Array.from(bytes, n => n.toString(16).padStart(2,'0')).join('').toUpperCase();
  }

  function chairText(order) { return order.item.box ? 'Locanın tamamı' : order.chairs.join(', '); }

  function openCheckout() {
    if ($('pay').disabled) return;
    pendingOrder = {item:unit,chairs:[...selected].sort((a,b) => a-b),count:partySize ?? selected.size,total:totalPrice()};
    $('order-event').textContent = active.artist + ' · ' + active.short;
    $('order-unit').textContent = unit.label;
    $('order-count').textContent = pendingOrder.count + ' kişi';
    const arrangement = $('order-chairs-row');
    arrangement.hidden = !unit.box && partySize !== null;
    arrangement.querySelector('dt').textContent = unit.box ? 'Rezervasyon' : 'Sandalyeler';
    $('order-chairs').textContent = chairText(pendingOrder);
    $('order-total').textContent = money(pendingOrder.total);
    $('confirm-order').checked = false;
    $('checkout-step').textContent = 'ADIM 2 / 3';
    $('checkout-title').textContent = 'Ödeme';
    $('payment-error').hidden = true;
    $('guest').value = 'Misafir';
    $('phone').value = '';
    $('payment-form').hidden = false;
    $('ticket').hidden = true;
    setStep(2);
    $('checkout').showModal();
    $('checkout-title').focus();
    script('qr-local.js').catch(() => {});
  }

  function digits(value) {
    return (value || '').replace(/\D/g, '');
  }

  function saveTicket(ticket) {
    try {
      const key = 'merit:tickets:v1';
      const list = JSON.parse(localStorage.getItem(key) || '[]');
      list.unshift(ticket);
      localStorage.setItem(key, JSON.stringify(list.slice(0, 50)));
    } catch {
      /* saklama kapalıysa bilet yine ekranda gösterilir */
    }
  }

  function completeOrder(event) {
    event.preventDefault();
    if (!pendingOrder || !$('confirm-order').checked) return;
    const name = $('guest').value.trim();
    if (!name) {
      $('payment-error').hidden = false;
      $('payment-error').textContent = 'Bilet üzerinde görünecek adı yaz.';
      $('guest').focus();
      return;
    }
    const phone = $('phone').value.trim();
    if (digits(phone).length < 10) {
      $('payment-error').hidden = false;
      $('payment-error').textContent = 'Bilet sorgusu için geçerli bir telefon numarası gir.';
      $('phone').focus();
      return;
    }
    lastTicket = {
      ...pendingOrder,
      code: orderCode(),
      name,
      phone,
      phoneKey: digits(phone).slice(-10),
      eventId: active.id,
      artist: active.artist,
      venue: active.venue ?? 'Merit Royal Diamond Hotel',
      date: active.date,
      iso: active.iso,
      createdAt: new Date().toISOString()
    };
    pendingOrder = null;
    const used = purchased.get(lastTicket.item.id) ?? new Set();
    lastTicket.chairs.forEach(chair => used.add(chair));
    purchased.set(lastTicket.item.id,used);
    createStock();
    selected.clear();
    if (partySize !== null || !canPick(unit)) highlight(null);
    else { buildChairs(); updateSelection(); }
    fillUnitOptions();
    saveTicket({
      code: lastTicket.code,
      eventId: lastTicket.eventId,
      artist: lastTicket.artist,
      venue: lastTicket.venue,
      date: lastTicket.date,
      iso: lastTicket.iso,
      unit: lastTicket.item.label,
      chairs: lastTicket.chairs,
      count: lastTicket.count,
      box: Boolean(lastTicket.item.box),
      name: lastTicket.name,
      phone: lastTicket.phone,
      phoneKey: lastTicket.phoneKey,
      total: lastTicket.total,
      createdAt: lastTicket.createdAt
    });
    renderTicket(lastTicket);
  }

  function renderTicket(ticket) {
    const values = {
      'ticket-event':active.artist,'ticket-date':active.date,'ticket-place':active.venue ?? 'Merit Royal Diamond · Girne',
      'ticket-seats':ticket.item.label + ' · ' + ticket.count + ' kişi · ' + (ticket.item.box ? chairText(ticket) : 'Sandalyeler ' + chairText(ticket)),
      'ticket-guest':ticket.name,'ticket-code':'Referans ' + ticket.code,'ticket-total':money(ticket.total)
    };
    Object.entries(values).forEach(([id,value]) => { $(id).textContent = value; });
    const image = $('ticket-qr');
    image.hidden = true;
    script('qr-local.js').then(() => {
      if (ticket !== lastTicket) return;
      image.src = window.meritQr('MERIT-SAMPLE|' + active.id + '|' + ticket.code);
      image.hidden = false;
    }).catch(() => {});
    $('checkout-step').textContent = 'ADIM 3 / 3';
    $('checkout-title').textContent = 'Biletin hazır';
    $('payment-form').hidden = true;
    $('ticket').hidden = false;
    setStep(3);
    $('checkout-title').focus();
  }

  function openWaitlist(event) {
    $('wait-event').textContent = event.artist + ' · ' + event.short;
    $('waitlist').showModal();
    if (waitEntry) showWaitResult();
    else $('waitlist-title').focus();
  }

  function showWaitResult() {
    $('wait-result').textContent = waitEntry.count + ' kişi için kaydın oluşturuldu. Referans ' + waitEntry.code + '.';
    $('wait-form').hidden = true;
    $('wait-confirm').hidden = false;
    $('wait-result').focus();
  }

  function setCamera(camera) {
    if (camera === 'top' || camera === 'overview') {
      viewMode = 'overview';
      viewpoint = null;
      located = null;
      syncHall();
    }
    hall?.camera(camera);
  }

  $('party-count').replaceChildren(...allChairs.map(number => new Option(number + ' kişi',String(number))));
  $('wait-count').replaceChildren(...allChairs.map(number => new Option(number + ' kişi',String(number))));
  $('wait-count').value = '2';
  $('wait-form').addEventListener('submit',event => {
    event.preventDefault();
    waitEntry = {count:$('wait-count').value,code:orderCode()};
    showWaitResult();
  });

  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click',() => button.closest('dialog').close()));
  document.querySelectorAll('[data-buy]').forEach(button => button.addEventListener('click',openParty));
  $('change-party').addEventListener('click',openParty);
  $('party-form').addEventListener('submit',submitParty);
  $('checkout').addEventListener('close',() => {
    if ($('checkout').open) return;
    pendingOrder = null;
    setStep(1);
    if ($('pay').disabled && document.activeElement === document.body) $('unit').focus({preventScroll:true});
  });
  $('pay').addEventListener('click',openCheckout);
  $('payment-form').addEventListener('submit',completeOrder);
  $('print-ticket').addEventListener('click',() => window.print());
  $('find-ticket').addEventListener('click',async () => {
    $('checkout').close();
    scrollBooking();
    await ensureHall();
    located = lastTicket.item;
    viewMode = 'ticket';
    viewpoint = null;
    if (hall) {
      hall.detail(located);
      syncHall();
    } else announce('Biletin ' + located.label + ' için düzenlendi.');
  });
  $('view-seat').addEventListener('click',async () => {
    if (!unit) return;
    await ensureHall();
    if (!hall || !unit) return;
    viewMode = 'pov';
    viewpoint = unit;
    hall.pov(viewpoint,selected.values().next().value);
    syncHall();
    $('cam-bar').querySelector('[data-camera="overview"]').focus({preventScroll:true});
    $('viewport').scrollIntoView({block:'center'});
    announce(unit.label + ' göz hizası açıldı.');
  });
  $('cam-bar').addEventListener('click',event => {
    const camera = event.target.closest('button')?.dataset.camera;
    if (camera) setCamera(camera);
  });
  $('unit').addEventListener('change',() => {
    const item = unitById.get($('unit').value);
    if (canPick(item)) highlight(item);
    else $('unit').value = unit?.id ?? '';
  });
  $('chairs').addEventListener('click',event => {
    const button = event.target.closest('[data-chair]');
    if (button) toggleChair(Number(button.dataset.chair));
  });
  $('select-all').addEventListener('click',() => {
    if (partySize !== null || !canPick(unit)) return;
    if (selected.size) selected.clear();
    else stock.get(unit.id).forEach(number => selected.add(number));
    updateSelection(true);
  });
  $('map-seats-link').addEventListener('click',() => $('unit-title').focus({preventScroll:true}));

  createStock();
  fillUnitOptions();
  updateEvent();
  if (requestedEvent || params.get('islem') === 'bilet') openParty();
})();
