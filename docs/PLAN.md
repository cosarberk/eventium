# Eventium — Platform Master Plan

## 0. Önce KALİTE (bu maddeyi asla unutma)
Hız ve basitlik hedef DEĞİL. Çabuk sonuç istenmiyor — **usta/senior seviye,
eksiksiz, cilalı** iş isteniyor. Sabit çözüm/sayfa üretilmez. Her karar
"bir IDE (Visual Studio / Photoshop / SolidWorks kalibresi) inşa ediyorum"
ölçütüyle verilir. Aceleyle atılan hiçbir kısayol kabul değil.

## 1. Misyon
Sabit bir dashboard app'i değil; **plugin'lerin verdiği ham veriyle kullanıcının
HİÇBİR kısıt olmadan istediğini inşa ettiği bir IDE / stüdyo.** Kullanıcı
"xxx plugininden şu alanlar geliyor" der ve o veriyle **code editor'dan
node-tabanlı blueprint'e** kadar ne isterse kurar — dashboard, sayfa, hatta
komple bir **web sitesi**. Plugin sadece veri verir; görselleştirmeyi/mantığı
kullanıcı kurar.

## 2. Değişmez ilkeler
1. **Kalite > hız** (madde 0).
2. **Freedom-first:** her alan aynı anda **select + elle yaz + id/isim arama**
   (+ değişken `$var`). Hiçbir seçenek elden alınmaz.
3. **Sınırsız inşa:** hazır paneller yetmezse kullanıcı **kendi kodunu** yazar
   (HTML/JS/CSS ve derlenen React) — site seviyesine kadar.
4. **Görsel mantık:** node/blueprint editörüyle "neyin neye bağlanacağı" kurulur.
5. **Tasarım bir özellik:** ileri seviye, modern, bağımsız (klasik değil).
   Menüler içeriği **sıkıştırmaz** → drawer/overlay/dock. **Full-responsive**
   (320px → 4K/TV). Light/dark, tutarlı token'lar.
6. **Güvenlik:** kullanıcı kodu sandbox (iframe + CSP) + stabil `data` API;
   rol bazlı yetki panele/aksiyona kadar.
7. **Korunan taban:** çalışan backend/veri katmanı (plugin SDK, resolveBindings,
   auth, events/queue) korunur; **frontend/UX sıfırdan** yeniden kurulur.

## 3. Mimari katmanlar
- **Data/Query engine:** plugin introspection (entity/alan/param/event) →
  freedom-first query builder (filters/aggregate/group-by/join/time), değişkenler.
- **Reactive graph:** paneller değişkenlere + birbirine (cross-filter) + canlı
  event'lere tepki verir; sadece etkilenen düğüm yeniden hesaplanır.
- **Canvas & panel sistemi:** serbest yerleşim (grid+freeform), dock/resize,
  seçim + properties drawer, undo/redo, çoklu view/sekme.
- **Custom code panelleri:** HTML/JS/CSS + React (esbuild-wasm), sandbox + data API.
- **Blueprint/Node editörü (React Flow):** source/transform/filter/aggregate/
  script/panel/action node'ları; edge = veri/mantık akışı; çalıştırma motoru.
- **Pages/composition:** iç içe + standalone/tam ekran sayfalar (site gibi),
  kullanıcı-tanımlı route/nav, drill-down/detay.
- **Persistence/portability:** kaydet/yükle, import/export, broadcast/TV, paylaşım.

## 4. Fazlar (her faz BİTİNCE commit — commit'e kendimi eklemem)
- **Faz 0 — Temel + Tasarım Sistemi + IDE Shell.** Token'lar (modern light/dark),
  tipografi/spacing/elevation/motion; IDE kabuğu (activity bar, dockable/collapsible
  paneller, ⌘K command palette, status bar, sekmeler), drawer/overlay sistemi,
  full-responsive iskelet. Kabul: açılışta "pro araç" hissi; hiçbir menü içeriği
  sıkıştırmıyor; 320px→4K sorunsuz.
- **Faz 1 — Data/Query + Query Builder + Değişkenler.** Plugin introspection UI
  ("xxx'ten şu veriler"), freedom-first alanlar, filter/aggregate/group-by,
  `$project` vb. runtime değişkenler (zincirli). Kabul: hiçbir alan tek yola
  zorlamıyor; ID elle de yazılabiliyor, listeden de seçiliyor (id+isim arama).
- **Faz 2 — Canvas & Panel sistemi v2.** Serbest tuval, panel kütüphanesi,
  drag/resize/dock, properties drawer, undo/redo. Kabul: kullanıcı sıfır kodla
  panel kurup yerleştirebiliyor.
- **Faz 3 — Custom Code Panelleri.** HTML/JS/CSS + React (esbuild-wasm), sandbox
  + `data`/`variables`/`emit` API. Kabul: kullanıcı elle bir panel/sayfa/"mini
  site" yazıp veriye bağlayabiliyor.
- **Faz 4 — Blueprint / Node Flow Editörü.** React Flow; node/edge modeli,
  çalıştırma motoru, node config'leri (freedom-first). Kabul: veri→transform→panel
  akışı görsel kuruluyor; cross-etkileşim tanımlanıyor.
- **Faz 5 — Pages / Composition / Navigation.** İç içe + standalone sayfalar,
  kullanıcı route/nav, drill-down/detay, cross-filter, reaktif graph. Kabul:
  kullanıcı çok sayfalı, site benzeri bir yapı kurabiliyor.
- **Faz 6 — Persistence & Portability & Broadcast.** Kaydet/yükle, import/export,
  TV/broadcast, paylaşım. Kabul: kurulan her şey kalıcı ve taşınabilir.
- **Faz 7 — Kalite Geçişi.** Performans, erişilebilirlik, mobil/tablet/TV,
  tema varyantları, onboarding, mikro-etkileşimler. Kabul: "wooow".

## 5. Çalışma disiplini
- Her faz bittiğinde **tek, temiz commit** (Co-Authored-By/Claude YOK).
- Main'e push yok; sen local'de test edersin. Roll-back: `git reset --hard v1.0.0`.
- Sabit/hardcoded sayfa yok; yalnızca kullanıcının kurmasını sağlayan araçlar.
