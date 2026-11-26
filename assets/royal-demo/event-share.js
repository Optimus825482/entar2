(() => {
  'use strict';
  const assets = 'assets/royal-demo/';
  const programme = 'https://www.merithotels.com/konserler';
  const dialog = document.createElement('dialog');
  dialog.id = 'event-share-dialog';
  dialog.setAttribute('aria-labelledby','event-share-title');
  dialog.innerHTML = `
    <div class="dialog-head">
      <h2 id="event-share-title">Etkinliği paylaş</h2>
      <form method="dialog"><button type="submit" class="close" aria-label="Paylaşımı kapat">×</button></form>
    </div>
    <div class="dialog-body">
      <div class="share-event">
        <strong data-share-artist></strong>
        <p data-share-details></p>
      </div>
      <div class="share-options">
        <a class="btn secondary" data-share-whatsapp target="_blank" rel="noopener noreferrer" autofocus>WhatsApp</a>
        <button class="btn secondary" type="button" data-share-instagram aria-expanded="false" aria-controls="instagram-share-panel">Instagram</button>
        <a class="btn secondary" data-share-facebook target="_blank" rel="noopener noreferrer">Facebook</a>
      </div>
      <div class="share-actions">
        <button class="btn secondary" type="button" data-copy-share-url>Bağlantıyı kopyala</button>
        <button class="btn secondary" type="button" data-copy-share-text>Paylaşım metnini kopyala</button>
      </div>
      <p class="dialog-note" data-share-local hidden>Yerel önizlemede Merit’in konser programı bağlantısı paylaşılır.</p>
      <section id="instagram-share-panel" aria-labelledby="instagram-share-title" hidden>
        <h3 id="instagram-share-title">Instagram Hikâyesi</h3>
        <p class="dialog-note" data-story-state>Hikâye görseli hazırlanıyor…</p>
        <img class="share-story" width="1080" height="1920" alt="" hidden>
        <div class="share-actions" data-story-actions hidden>
          <a class="btn primary" data-save-story>Görseli indir</a>
          <button class="btn secondary" type="button" data-send-story hidden>Cihazdan paylaş</button>
          <a class="btn secondary" href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer">Instagram’ı aç ↗</a>
        </div>
      </section>
      <label data-share-manual hidden>Paylaşmak için kopyala
        <textarea rows="4" readonly></textarea>
      </label>
      <p class="dialog-note share-feedback" data-share-feedback role="status"></p>
    </div>`;
  document.body.append(dialog);

  const get = selector => dialog.querySelector(selector);
  const whatsapp = get('[data-share-whatsapp]');
  const facebook = get('[data-share-facebook]');
  const instagram = get('[data-share-instagram]');
  const storyPanel = get('#instagram-share-panel');
  const storyState = get('[data-story-state]');
  const storyPreview = get('.share-story');
  const storyActions = get('[data-story-actions]');
  const storyDownload = get('[data-save-story]');
  const storyShare = get('[data-send-story]');
  const feedback = get('[data-share-feedback]');
  const manualCopy = get('[data-share-manual]');
  const localPosters = new Map();
  let current;

  function eventLink(event) {
    const address = new URL(location.href);
    const local = !['http:','https:'].includes(address.protocol) ||
      !address.hostname.includes('.') ||
      /^(?:localhost\.|127\.|0\.|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)|\.local$/i.test(address.hostname);
    if (local) return {url:programme,local};
    const url = new URL('merit-etkinlik.html',address);
    url.searchParams.set('id',event.id);
    return {url:url.href,local};
  }

  async function copy(text,success) {
    const state = current;
    manualCopy.hidden = true;
    try {
      await navigator.clipboard.writeText(text);
      if (state === current) feedback.textContent = success;
    } catch {
      if (state !== current) return;
      const input = manualCopy.querySelector('textarea');
      input.value = text;
      manualCopy.hidden = false;
      input.focus();
      input.select();
      feedback.textContent = 'Metin seçildi. Kopyalayabilirsiniz.';
    }
  }

  async function loadImage(src) {
    const img = new Image();
    img.src = src;
    try {
      await img.decode();
      return img;
    } catch {
      return null;
    }
  }

  function localPoster(id) {
    if (localPosters.has(id)) return Promise.resolve(localPosters.get(id));
    return new Promise(resolve => {
      const script = document.createElement('script');
      script.src = assets + 'share-posters/' + encodeURIComponent(id) + '.js';
      const finish = () => {
        script.remove();
        resolve(localPosters.get(id));
      };
      script.addEventListener('load',finish,{once:true});
      script.addEventListener('error',finish,{once:true});
      document.head.append(script);
    });
  }

  function drawLines(ctx,text,x,y,width,lineHeight) {
    let line = '';
    for (const word of text.split(/\s+/)) {
      const next = line ? line + ' ' + word : word;
      if (line && ctx.measureText(next).width > width) {
        ctx.fillText(line,x,y,width);
        y += lineHeight;
        line = word;
      } else {
        line = next;
      }
    }
    ctx.fillText(line,x,y,width);
    return y + lineHeight;
  }

  async function drawStory(event) {
    const source = event.image && (location.protocol === 'file:' ? await localPoster(event.id) : assets + event.image);
    const poster = source ? await loadImage(source) : null;
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    const shade = ctx.createRadialGradient(540,660,40,540,760,1100);
    shade.addColorStop(0,'#49341f');
    shade.addColorStop(1,'#100e0c');
    ctx.fillStyle = shade;
    ctx.fillRect(0,0,1080,1920);
    ctx.strokeStyle = '#c59a58';
    ctx.lineWidth = 2;
    ctx.strokeRect(58,64,964,1792);
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#e9c78e';
    ctx.font = '600 35px sans-serif';
    ctx.fillText('MERIT ENTERTAINMENT',104,126,872);
    ctx.fillRect(104,194,86,3);

    if (poster) {
      const scale = Math.min(872/poster.naturalWidth,934/poster.naturalHeight);
      const width = poster.naturalWidth*scale;
      const height = poster.naturalHeight*scale;
      ctx.fillStyle = '#15100d';
      ctx.fillRect(104,240,872,934);
      ctx.drawImage(poster,540-width/2,707-height/2,width,height);
    }

    ctx.fillStyle = '#e9c78e';
    ctx.font = '600 35px sans-serif';
    const labelTop = poster ? 1238 : 622;
    const label = (event.label || 'Konser').toLocaleUpperCase('tr-TR');
    ctx.fillText(label,104,labelTop,872);
    ctx.font = 'bold 86px Georgia, serif';
    ctx.fillStyle = '#fff3df';
    const titleBottom = drawLines(ctx,event.artist,104,labelTop+58,872,93);
    ctx.fillStyle = '#f4d2a0';
    ctx.font = '600 44px sans-serif';
    const dateBottom = drawLines(ctx,event.date || event.short,104,titleBottom+24,872,58);
    ctx.fillStyle = '#e4dace';
    ctx.font = '39px sans-serif';
    drawLines(ctx,event.venue || 'Merit Entertainment',104,dateBottom+5,872,50);
    return new Promise((resolve,reject) => canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Unable to export the share image'));
    },'image/jpeg',.9));
  }

  async function prepareStory(event) {
    const slug = event.id.startsWith('merit-') ? event.id : 'merit-' + event.id;
    const filename = slug + '-hikaye.jpg';
    const blob = await drawStory(event);
    const file = new File([blob],filename,{type:'image/jpeg'});
    return {url:URL.createObjectURL(file),filename,file};
  }

  async function showInstagram() {
    const state = current;
    if (state.story || state.preparingStory) return;
    state.preparingStory = true;
    manualCopy.hidden = true;
    feedback.textContent = '';
    storyPanel.hidden = false;
    instagram.setAttribute('aria-expanded','true');
    instagram.setAttribute('aria-busy','true');
    storyState.textContent = 'Hikâye görseli hazırlanıyor…';
    try {
      const story = await prepareStory(state.event);
      if (state !== current || !dialog.open) {
        if (story.file) URL.revokeObjectURL(story.url);
        return;
      }
      state.story = story;
      storyPreview.src = story.url;
      storyPreview.alt = state.event.artist + ' için Instagram hikâye görseli';
      storyPreview.hidden = false;
      storyDownload.href = story.url;
      storyDownload.download = story.filename;
      storyShare.hidden = !story.file || !navigator.share || !navigator.canShare?.({files:[story.file]});
      storyActions.hidden = false;
      storyState.textContent = 'Görseli Instagram hikâyenize ekleyebilirsiniz.';
    } catch {
      if (state === current) storyState.textContent = 'Görsel hazırlanamadı. Paylaşım metnini kopyalayabilirsiniz.';
    } finally {
      state.preparingStory = false;
      if (state === current) instagram.removeAttribute('aria-busy');
    }
  }

  function open(event) {
    if (!event || dialog.open) return;
    const {url,local} = eventLink(event);
    const details = [event.date || event.short,event.venue].filter(Boolean);
    const text = [event.artist,...details,'',url].join('\n');
    current = {event,url,text};
    get('[data-share-artist]').textContent = event.artist;
    get('[data-share-details]').textContent = details.join(' · ');
    whatsapp.href = 'https://wa.me/?text=' + encodeURIComponent(text);
    facebook.href = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url);
    get('[data-share-local]').hidden = !local;
    feedback.textContent = '';
    manualCopy.hidden = true;
    storyPanel.hidden = true;
    instagram.removeAttribute('aria-busy');
    instagram.setAttribute('aria-expanded','false');
    storyPreview.hidden = true;
    storyActions.hidden = true;
    dialog.showModal();
  }

  instagram.addEventListener('click',showInstagram);
  get('[data-copy-share-url]').addEventListener('click',() => copy(current.url,'Bağlantı kopyalandı.'));
  get('[data-copy-share-text]').addEventListener('click',() => copy(current.text,'Paylaşım metni kopyalandı.'));
  storyShare.addEventListener('click',async () => {
    try {
      await navigator.share({files:[current.story.file],title:current.event.artist,text:current.text});
    } catch (error) {
      if (error?.name !== 'AbortError') feedback.textContent = 'Görseli indirerek Instagram’a ekleyebilirsiniz.';
    }
  });
  dialog.addEventListener('close',() => {
    if (current?.story?.file) URL.revokeObjectURL(current.story.url);
    current = null;
  });

  window.MeritShare = {
    open,
    addLocalPoster(id,src) { localPosters.set(id,src); }
  };
})();
