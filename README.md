# Japan Trip 2026

Excel'den web app'e taşınmış kişisel seyahat planlayıcısı.
Veri `src/data/*.json` içinde, UI Vite + React + Tailwind.

## Yapı

```
src/
  data/         # JSON kaynak veri (LLM-friendly, doğrudan düzenle)
    trip.json
    days.json
    reservations.json
    shopping.json
  views/        # Tab ekranları
  components/   # Paylaşılan UI
  lib/          # State + derive helpers + sync
  types.ts      # JSON şemasını dokümante eden TS tipleri
api/            # Vercel serverless edge functions (auth + sync)
public/
  login.html    # PIN gate (Vercel deploy'da gizli, GH Pages'te görünmez)
middleware.ts   # Vercel edge auth
vercel.json     # Vercel build config
raw/            # Orijinal CSV arşivi (referans, app okumuyor)
scripts/
  import-csv.py        # raw/ → src/data/ tek-seferlik dönüştürücü
  apply-maps-patch.py  # claude.ai web batch'lerini JSON'a işler
```

## Komutlar

```bash
npm install
npm run dev          # local dev
npm run build        # static build → dist/
npm run typecheck    # tsc --noEmit
npm run import       # raw/*.csv → src/data/*.json
```

## Hosting seçenekleri

### A) GitHub Pages (varsayılan, public)
`main`'e push → GH Actions otomatik deploy.
URL: https://mburakreis.github.io/japan-trip/
- ✓ Ücretsiz, sıfır setup
- ✗ Auth yok — site public erişime açık
- ✗ Online sync yok (lokal localStorage)

### B) Vercel (önerilen, PIN korumalı + online sync)
1. https://vercel.com → GitHub ile giriş
2. **Add New → Project** → `mburakreis/japan-trip` seç → **Import**
3. Build & deploy ayarları:
   - Framework: Vite (otomatik bulur)
   - Build command: `npm run build`
   - Output: `dist`
4. **Environment Variables** ekle:
   - `APP_PIN_HASH` — PIN'inin SHA-256 hash'i
     ```bash
     # PIN'i sen seç (örn 1234), hash'i hesapla:
     node -e "console.log(require('crypto').createHash('sha256').update('1234').digest('hex'))"
     ```
5. **Storage → Create Database → KV** → ad: `japan-trip-kv` → "Connect Project"
   (KV_REST_API_URL ve KV_REST_API_TOKEN otomatik enjekte olur)
6. Deploy → bekle → URL'i aç → PIN gir → app açılır

Senkron çalışma: shopping ekleme/silme/check, eklendikten 2sn sonra otomatik
KV'ye gönderilir. Diğer cihazlarda sayfa açılınca otomatik pull.

GH Pages workflow paralel kalır; istemediğinde `.github/workflows/deploy.yml`'i sil.

## Veri düzenleme

Bir gün/rezervasyon/alışveriş satırı eklemek/değiştirmek için
ilgili `src/data/*.json` dosyasını doğrudan düzenle. LLM'e
"şu güne şu aktiviteyi ekle" dediğinde dosyada minimal diff üretir,
git history changelog görevini görür.
