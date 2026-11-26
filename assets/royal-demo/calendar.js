(() => {
  'use strict';
  const assets = 'assets/royal-demo/';
  const clips = new Map((window.MeritClips ?? []).map(clip => [clip.id,clip]));

  function element(tag,className,text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function date(event) {
    const time = element('time',null,event.short);
    time.dateTime = event.iso;
    return time;
  }

  function eventLink(event,action,label,className) {
    const link = element('a',className,label);
    const search = new URLSearchParams({etkinlik:event.id});
    if (action) search.set('islem',action);
    link.href = 'merit-bilet.html?' + search + (action ? '' : '#salon');
    link.setAttribute('aria-label',event.artist + ' · ' + (event.venue ?? 'Merit Hotels') + ' · ' + label);
    return link;
  }

  function detailLink(event) {
    const link = element('a','btn secondary','Detaylar');
    link.href = 'merit-etkinlik.html?id=' + encodeURIComponent(event.id);
    link.setAttribute('aria-label',event.artist + ' · ' + event.short + ' · etkinlik detayları');
    return link;
  }

  function card(event,showClip = true) {
    const article = element('article','poster');
    const figure = element('figure','poster-figure');
    const image = new Image(288,360);
    image.loading = 'lazy';
    image.decoding = 'async';
    image.alt = '';
    const still = event.image ?? 'view-rear.webp';
    image.src = assets + still;
    image.dataset.still = assets + still;
    const dateTag = date(event);
    dateTag.className = 'poster-date';
    figure.append(image,dateTag);

    const body = element('div','poster-body');
    const actions = element('div','poster-actions');
    if (event.sold) actions.append(eventLink(event,'bekleme','Bekleme listesi','btn secondary'));
    else actions.append(eventLink(event,'bilet','Bilet Al','btn primary'));
    actions.append(detailLink(event));
    const clip = clips.get(event.clip);
    if (showClip && clip) image.dataset.clip = assets + clip.animated;
    body.append(element('h3',null,event.artist),element('p',null,event.venue),actions);
    article.append(figure,body);
    return article;
  }

  const upcoming = window.MeritEvents.filter(event => !event.past)
    .sort((a,b) => a.iso.localeCompare(b.iso) || a.artist.localeCompare(b.artist,'tr'));
  const royalGrid = document.getElementById('royal-programme');
  if (royalGrid) {
    const royalEvents = upcoming.filter(event => event.venue.includes('Merit Royal Diamond'));
    if (royalEvents.length) royalGrid.replaceChildren(...royalEvents.map(event => card(event)));
    else royalGrid.append(element('p',null,'Yaklaşan Merit Royal Diamond konseri bulunmuyor.'));
  }

  if (royalGrid) window.MeritMotion.observe(royalGrid, { period: 4600 });

  const similarGrid = document.getElementById('similar-grid');
  if (similarGrid) {
    const currentId = new URLSearchParams(location.search).get('id');
    const list = upcoming.filter(event => event.id !== currentId).slice(0, 3);
    similarGrid.replaceChildren(...list.map(event => card(event, false)));
    window.MeritMotion.observe(similarGrid);
  }

  const archiveGrid = document.getElementById('archive-grid');
  if (archiveGrid && Array.isArray(window.MeritArchive)) {
    const cards = window.MeritArchive.map(item => {
      const article = element('article','archive-card');
      const figure = element('figure','archive-figure');
      const image = new Image(720,900);
      image.decoding = 'async';
      image.alt = item.artist + ', ' + item.venue + ' konseri';
      image.src = assets + item.still;
      image.dataset.still = assets + item.still;
      if (item.clip) image.dataset.clip = assets + item.clip;
      figure.append(image);
      const body = element('div','archive-body');
      body.append(element('h3',null,item.artist));
      const meta = element('p',null,item.venue);
      if (item.tag) meta.append(element('span','archive-tag',item.tag));
      body.append(meta);
      article.append(figure,body);
      return article;
    });
    archiveGrid.replaceChildren(...cards);
    window.MeritMotion.observe(archiveGrid, { period: 5400 });
  }

  const form = document.querySelector('.discovery');
  if (!form) return;
  const royal = document.getElementById('upcoming-royal-grid');
  const grid = royal || document.getElementById('poster-grid');
  const events = upcoming;
  const query = document.getElementById('event-query');
  const month = document.getElementById('event-month');
  const status = document.getElementById('event-count');
  const monthLabel = new Intl.DateTimeFormat('tr', {month:'long', year:'numeric'});
  for (const value of new Set(events.map(event => event.iso.slice(0,7)))) {
    month.add(new Option(monthLabel.format(new Date(value + '-01T12:00:00')),value));
  }
  function normalize(value) {
    return value.toLocaleLowerCase('tr').normalize('NFD').replace(/\p{M}/gu,'').replaceAll('ı','i');
  }
  function render() {
    const term = normalize(query.value.trim());
    const matches = events.filter(event => event.iso.startsWith(month.value) &&
      normalize(event.artist + ' ' + event.venue).includes(term));
    grid.replaceChildren(...matches.map(event => card(event)));
    status.textContent = matches.length ? matches.length + ' etkinlik' : 'Etkinlik bulunamadı. Başka bir isim veya ay deneyin.';
    window.MeritMotion.observe(grid);
  }
  form.addEventListener('input',render);
  form.addEventListener('submit',event => event.preventDefault());
  form.addEventListener('reset',() => requestAnimationFrame(render));
  render();
})();
