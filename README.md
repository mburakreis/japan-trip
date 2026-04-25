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
    budget.json
    shopping.json
  views/        # Tab ekranları
  components/   # Paylaşılan UI
  types.ts      # JSON şemasını dokümante eden TS tipleri
raw/            # Orijinal CSV arşivi (referans, app okumuyor)
scripts/
  import-csv.py # raw/ → src/data/ tek-seferlik dönüştürücü
```

## Komutlar

```bash
npm install
npm run dev          # local dev
npm run build        # static build → dist/
npm run typecheck    # tsc --noEmit
npm run import       # raw/*.csv → src/data/*.json (CSV'leri yenilersen)
```

## Deploy

`main` branch'e push → GitHub Actions otomatik build edip GitHub Pages'e
deploy eder. Pages ayarı: Settings → Pages → Source: GitHub Actions.

URL: `https://mburakreis.github.io/japan-trip/`

## Veri düzenleme

Bir gün/rezervasyon/alışveriş satırı eklemek/değiştirmek için
ilgili `src/data/*.json` dosyasını doğrudan düzenle. LLM'e
"şu güne şu aktiviteyi ekle" dediğinde dosyada minimal diff üretir,
git history changelog görevini görür.
