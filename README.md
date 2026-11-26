# Merit Entertainment

Konser programı, etkinlik detayları, 3B masa seçimi ve örnek e-bilet akışından oluşan statik site. Nginx, ana sayfayı `/` üzerinden ve yayın varlıklarını `/assets/` üzerinden sunar.

## Coolify

1. Projede **New → Public Repository** ile `https://github.com/Optimus825482/entar2.git` deposunu ekleyin.
2. Dal olarak `main`, **Build Pack** olarak **Dockerfile** seçin. **Base Directory** için `/` ve **Dockerfile Location** için `/Dockerfile` girin.
3. **Ports Exposes** değerini `80` yapın. **Domains** alanına `https://bilet2.erkanerdem.online` yazın.
4. DNS’te `bilet2` alt alan adını Coolify sunucusuna yönlendirin. HTTPS sertifikası için sunucunun 80 ve 443 numaralı portları Coolify proxy’sine erişebilmeli.
5. **Deploy** seçin. Açılışı, bir etkinliğin **Bilet Al** akışını ve masa seçildiğinde sahne görselinin yüklendiğini kontrol edin.

Uygulama ortam değişkeni veya veritabanı gerektirmez. Örnek biletler tarayıcıda saklanır. Ödeme adımı işlem ücreti tahsil etmez.

[Coolify Dockerfile kılavuzu](https://coolify.io/docs/applications/builds/dockerfile) · [Coolify alan adı kılavuzu](https://coolify.io/docs/core/networking/domains)

## Sahne görsellerini yeniden üretme

Salon planı ve referans görselleri değiştiğinde Node.js, FFmpeg ve ffprobe ile `node tools/render-sightlines.cjs` çalıştırın. Üretilen WebP dosyaları `assets/royal-demo/sightlines/` altında tutulur ve doğrudan yayın paketine dahil edilir.
