<div align="center">
  <img src="assets/icon-128.png" width="112" height="112" alt="WX Shot logosu">

  # WX Shot for Windows

  **Seç. Gizle. İşaretle. Kaydet.**

  Windows için hızlı, yerel ve gizlilik odaklı ekran görüntüsü uygulaması.

  [![Sürüm](https://img.shields.io/badge/sürüm-1.2.0-6D5FE8?style=for-the-badge)](#sürüm-notları)
  [![Windows](https://img.shields.io/badge/Windows-10%20%7C%2011-0078D4?style=for-the-badge&logo=windows11&logoColor=white)](#sistem-gereksinimleri)
  [![Electron](https://img.shields.io/badge/Electron-44-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)
  [![Lisans](https://img.shields.io/badge/lisans-MIT-F59E0B?style=for-the-badge)](LICENSE)
  [![Gizlilik](https://img.shields.io/badge/veriler-cihazda-16A34A?style=for-the-badge&logo=shield&logoColor=white)](#gizlilik)

  [Kurulum](#kurulum) · [Kullanım](#kullanım) · [Özellikler](#özellikler) · [Kaynak koddan çalıştırma](#kaynak-koddan-çalıştırma)
</div>

---

## WX Shot nedir?

WX Shot; ekranın tamamını veya seçtiğiniz bir alanı yakalamanızı, görüntüyü güçlü düzenleme araçlarıyla işaretlemenizi, hassas bilgileri gizlemenizi ve sonucu panoya ya da dosyaya aktarmanızı sağlar. Hesap açtırmaz, telemetri toplamaz ve görüntülerinizi internete göndermez.

## Özellikler

- `PrtSc` ile sistem genelinde alan yakalama
- `Alt + Shift + S` ile alan, `Alt + Shift + F` ile monitör yakalama
- Çoklu monitör ve yüksek DPI desteği
- Kalem basıncı destekli akıcı çizim motoru
- Kalem, vurgulayıcı, çizgi, ok, dikdörtgen ve elips
- Hazır renk paleti ve sınırsız özel renk seçici
- Metin, silgi, bulanıklaştırma ve pikselleştirme
- Windows'un cihaz içi OCR motoruyla hassas bilgi tespiti ve gizleme
- Renk, kalınlık, dolgu, saydamlık, kesik çizgi, gölge ve ok ucu seçenekleri
- `%25–%400` yakınlaştırma ve çalışma alanını kaydırma
- Sınırsız çalışma akışına uygun geri al/yinele
- PNG, JPEG ve WebP dışa aktarma
- `%100`, `%75` ve `%50` çıktı ölçeği
- Windows panosuna kopyalama ve **Farklı kaydet**
- Son altı çıktıyı yalnızca bilgisayarda tutan yerel geçmiş
- Sistem tepsisi ve modern başlangıç paneli
- Yüksek kontrast ve azaltılmış hareket erişilebilirlik seçenekleri

## Sistem gereksinimleri

| Gereksinim | Destek |
|---|---|
| İşletim sistemi | Windows 10 veya Windows 11 |
| Mimari | 64 bit (x64) |
| İnternet | Kurulum ve kullanım sırasında gerekmez |
| OCR | Windows'un yerleşik OCR bileşeni |

## Kurulum

### Son kullanıcı için önerilen yöntem

1. GitHub sayfasının sağındaki **Releases** bölümünü açın.
2. En son sürümün **Assets** alanından `WX-Shot-Windows-Setup-1.2.0-x64.exe` dosyasını indirin.
3. Kurulum dosyasını çalıştırın.
4. Kurulum konumunu seçip işlemi tamamlayın.
5. WX Shot'ı masaüstü kısayolundan veya Başlat menüsünden açın.

Bu teslim klasörünü doğrudan aldıysanız aynı kurulum dosyasını `release-assets` klasöründe bulabilirsiniz.

> [!NOTE]
> Kurulum paketi henüz ticari bir kod imzalama sertifikasıyla imzalanmadığı için Windows SmartScreen “Bilinmeyen yayıncı” uyarısı gösterebilir. Dosyayı bu projenin resmi GitHub Releases sayfasından indirdiğinizden emin olun; ardından **Daha fazla bilgi → Yine de çalıştır** yolunu kullanabilirsiniz.

### Kaldırma

**Ayarlar → Uygulamalar → Yüklü uygulamalar → WX Shot → Kaldır** yolunu izleyin. Kaldırma sırasında kullanıcı geçmişi otomatik silinmez; bu tercih, yanlışlıkla veri kaybını önlemek içindir.

## Kullanım

1. `PrtSc` veya `Alt + Shift + S` tuşlarına basın.
2. Fareyle yakalamak istediğiniz alanı seçin. `Enter` tüm monitörü alır, `Esc` işlemi iptal eder.
3. Açılan editörde çizim ve gizleme araçlarını kullanın.
4. Sonucu **Kopyala** ile panoya alın veya **Farklı kaydet** ile bilgisayarınıza kaydedin.

> [!TIP]
> Windows veya başka bir uygulama `PrtSc` tuşunu kullanıyorsa WX Shot bu kısayolu zorla devralmaz. Böyle bir durumda `Alt + Shift + S` kısayolu çalışmaya devam eder.

## Klavye kısayolları

| İşlem | Kısayol |
|---|---:|
| Alan yakala | `PrtSc` veya `Alt + Shift + S` |
| Monitörü yakala | `Alt + Shift + F` |
| Kalem / vurgulayıcı | `P` / `H` |
| Çizgi / ok | `L` / `A` |
| Dikdörtgen / elips | `R` / `O` |
| Bulanıklaştır / pikselleştir | `B` / `X` |
| Metin / silgi | `T` / `E` |
| Geri al / yinele | `Ctrl + Z` / `Ctrl + Shift + Z` |
| Yakınlaştır | `Ctrl + fare tekerleği` |
| Kaydır | `Space + sürükle` veya orta fare tuşu |

## Gizlilik

- Ekran görüntüleri, OCR sonuçları ve çizimler bir sunucuya gönderilmez.
- OCR işlemi Windows 10/11 ile gelen `Windows.Media.Ocr` motorunda yapılır.
- Geçmiş, uygulamanın yerel kullanıcı verisi klasöründe en fazla altı sıkıştırılmış önizleme olarak tutulur.
- Telemetri, reklam, kullanıcı hesabı, bulut senkronizasyonu ve uzaktan çalıştırılan kod bulunmaz.

## Kaynak koddan çalıştırma

Geliştirme için Windows 10/11, [Node.js 22+](https://nodejs.org/) ve npm gerekir.

```powershell
git clone <depo-adresiniz>
cd wx-shot-windows
npm ci
npm test
npm run check
npm start
```

Kurulum dosyasını oluşturmak için:

```powershell
npm run dist:win
```

Üretilen `.exe` dosyası `dist` klasöründe yer alır. Paketlenmiş klasör sürümü için `npm run pack:win` komutunu kullanabilirsiniz.

## GitHub'da yayınlama

GitHub normal depo dosyaları için boyut sınırı uyguladığı için kurulum dosyasını kaynak kodla birlikte commit etmeyin. Bu teslimdeki `release-assets` klasörü yalnızca yayın dosyalarını bir arada tutar.

1. Depo kökündeki kaynak kodu GitHub'a gönderin; `.gitignore`, `release-assets` içindeki büyük `.exe` dosyasını otomatik olarak hariç tutar.
2. GitHub'da **Releases → Draft a new release** seçeneğini açın.
3. Etiket ve sürüm başlığı olarak `v1.2.0` kullanın.
4. `release-assets/WX-Shot-Windows-Setup-1.2.0-x64.exe` ve SHA-256 dosyasını **Assets** alanına sürükleyin.
5. Sürümü yayımlayın.

Yeni bir `v*` etiketi gönderildiğinde `.github/workflows/windows-release.yml` iş akışı testleri çalıştırır, Windows kurulum paketini üretir ve GitHub Release'e ekler.

İş akışı sırasında ayrıca bir `GH_TOKEN` tanımlamanız gerekmez. Derleme adımında `electron-builder` otomatik yayını kapatılır; yalnızca etiket sürümündeki son adım GitHub'ın sağladığı sınırlı `github.token` ile setup ve `WX-Shot-Windows-SHA256.txt` dosyasını Release'e yükler.

## Proje yapısı

```text
wx-shot-windows/
├── .github/workflows/         # Windows test ve sürüm iş akışı
├── assets/                    # Uygulama ikonları
├── release-assets/            # GitHub Release'e yüklenecek yerel dosyalar
├── scripts/                   # İkon üretimi ve Windows OCR köprüsü
├── src/                       # Ana süreç, güvenli köprü ve arayüz
├── tests/                     # Birim, uygulama ve OCR testleri
├── build-release.ps1          # Yerel sürüm hazırlama yardımcısı
├── package.json
└── LICENSE
```

## Test ve kalite

```powershell
npm test
npm run check
```

Gerçek Windows masaüstü oturumunda monitör yakalama, alan seçimi, kırpma, kalem, silgi, bulanıklaştırma, özel renk seçimi, panoya görüntü kopyalama, yakınlaştırma, PNG/JPEG/WebP çıktıları ve yerel OCR akışı doğrulanmıştır.

## Güvenlik mimarisi

- Görüntüleyicilerde `nodeIntegration: false`, `contextIsolation: true` ve `sandbox: true`
- Yalnızca izin verilen işlemleri açan sınırlı preload köprüsü
- Dış gezinme ve yeni pencere isteklerinin engellenmesi
- Görüntü türü ve boyutu doğrulaması
- Atomik yerel geçmiş yazımı
- OCR geçici dosyalarının işlem sonunda silinmesi
- Paket içinde uzaktan indirilen veya dinamik çalıştırılan kod bulunmaması

Güvenlik açığını herkese açık issue oluşturmadan bildirmek için [SECURITY.md](SECURITY.md) dosyasındaki yöntemi kullanın.

## Katkıda bulunma

Hata bildirimleri ve geliştirme önerileri değerlidir. Değişiklik göndermeden önce [CONTRIBUTING.md](CONTRIBUTING.md) dosyasını okuyun.

## Sürüm notları

### v1.2.0

- Electron 44'ün yeni `ClipboardItem` API'siyle Windows panosuna görüntü kopyalama düzeltildi
- Araç simgeleri sade, tutarlı ve yüksek çözünürlüklü SVG ikonlarla yenilendi
- Hazır renklerin görünürlüğü düzeltildi
- Windows renk penceresinden istenen rengi seçme özelliği eklendi
- GitHub kaynak ve sürüm paketi v1.2.0 için güncellendi

### v1.0.0

- WX Shot'ın ilk kararlı Windows sürümü
- Alan ve monitör yakalama
- Çizim, açıklama, gizleme, OCR, pano, dışa aktarma ve geçmiş özellikleri

## Lisans

Bu proje [MIT Lisansı](LICENSE) ile sunulur.

---

<div align="center">
  WX Shot ile ekran görüntüleriniz bilgisayarınızda kalır.
</div>
