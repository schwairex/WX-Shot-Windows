# WX Shot for Windows 1.0.0 — Hızlı Kurulum

1. GitHub **Releases** sayfasından `WX-Shot-Windows-Setup-1.0.0-x64.exe` dosyasını indirin. Bu teslim klasörünü doğrudan aldıysanız dosya `release-assets` içindedir.
2. `WX-Shot-Windows-SHA256.txt` içindeki değerle indirdiğiniz dosyanın bütünlüğünü isterseniz doğrulayın.
3. Kurulum dosyasını çalıştırın, kurulum klasörünü seçip işlemi tamamlayın.
4. WX Shot'u Başlat menüsünden açın.
5. `PrtSc` veya `Alt + Shift + S` ile alan yakalamayı başlatın.

## Dosya bütünlüğünü doğrulama

PowerShell'de kurulum dosyasının bulunduğu klasörde aşağıdaki komutu çalıştırabilirsiniz:

```powershell
Get-FileHash -Algorithm SHA256 .\WX-Shot-Windows-Setup-1.0.0-x64.exe
```

Çıktı, `WX-Shot-Windows-SHA256.txt` içindeki değerle aynı olmalıdır.

## Sorun giderme

- **PrtSc çalışmıyor:** Windows ekran alıntısı özelliği tuşu kullanıyor olabilir. `Alt + Shift + S` kullanın.
- **Ekranda uygulamanın kendisi görünüyor:** Yakalama öncesinde pencerenin gizlenmesi için kısa bir süre bekleyin ve yeniden deneyin.
- **OCR sonuç vermiyor:** Windows dil paketinizde OCR desteğinin kurulu olduğundan emin olun; manuel pikselleştirme/bulanıklaştırma her zaman kullanılabilir.
- **SmartScreen uyarısı:** Paket kod imzalama sertifikası taşımıyorsa Windows bilinmeyen yayıncı uyarısı gösterebilir.
- **Uygulama kapanmış görünmesine rağmen çalışıyor:** WX Shot sistem tepsisinde çalışır. Tamamen kapatmak için tepsi simgesine sağ tıklayıp **Çıkış** seçeneğini kullanın.
