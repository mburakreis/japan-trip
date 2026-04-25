# raw/

Excel'den export edilen ham CSV dosyaları buraya konur. Her sheet ayrı CSV
olarak yüklenir. Bu klasör veri kaynağıdır; uygulama bu CSV'lerden üretilen
`/data/*.json` dosyalarını okur.

Tipik dosyalar:
- `days.csv` — günlük plan
- `reservations.csv` — rezervasyonlar (link + email dahil)
- `budget.csv` — bütçe
- `shopping.csv` — alışveriş listesi
- diğer sheet'ler...
