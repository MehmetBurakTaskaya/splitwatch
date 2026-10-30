# Splitwatch

Watch several YouTube sports live streams side by side, in one window. Free and open source, for
Windows and macOS.

> **Early development.** Version 0.1.0 sets up the app, its updates and its languages. Watching
> streams arrives in the next versions; see the [roadmap](docs/ROADMAP.md).

## What it will do

- A grid of 1, 2, 3, 4, 6 or 9 streams, or one large stream with a side strip, each a "lane".
- Audio follows the stream you choose; keyboard shortcuts for everything.
- Search for live streams, curated presets per sport, or paste a link.
- Saved layouts, a small always-on-top mini mode, and notifications when followed channels go live.
- Hand-made visual themes per sport, and special modes for the Summer and Winter Games.
- Works without an API key; with your own free YouTube Data API key, search and live checks turn on.

## Download

Get the latest version from [Releases](https://github.com/MehmetBurakTaskaya/splitwatch/releases/latest):

| System                                              | File                                     |
| --------------------------------------------------- | ---------------------------------------- |
| Windows 10 or 11 (64-bit)                           | `Splitwatch-Setup-<version>-x64.exe`     |
| macOS 13 Ventura or later (Apple Silicon and Intel) | `Splitwatch-<version>-mac-universal.dmg` |

Splitwatch is not code-signed yet, so both systems warn the first time.

**Windows.** If Microsoft Defender SmartScreen says "Windows protected your PC", click **More info**,
then **Run anyway**.

**macOS.** Open the `.dmg` and drag Splitwatch to Applications. The first time, macOS says the app
cannot be checked. Open **System Settings → Privacy & Security**, scroll down and click **Open Anyway**
next to the message about Splitwatch. Or run this once in Terminal:

```sh
xattr -dr com.apple.quarantine /Applications/Splitwatch.app
```

**Updates.** On Windows, Splitwatch updates itself and asks you to restart. On macOS it tells you when
a new version is out and opens the download page: automatic updates on macOS need a paid Apple
certificate. More in [docs/signing.md](docs/signing.md).

## Privacy

No account, no tracking, no analytics. Splitwatch talks only to YouTube (for the streams) and to
GitHub (for updates). Details in [PRIVACY.md](PRIVACY.md).

## Build from source

Node.js 24 and npm.

```sh
npm ci
npm start               # build and run
npm run check           # type check, lint, format check, unit tests
npm run test:e2e        # Electron smoke tests (after npm run build)
npm run dist            # installer for the current system, in release/
```

How the code is organized and why: [docs/adr](docs/adr). How to help, including translations:
[CONTRIBUTING.md](CONTRIBUTING.md).

## License and trademarks

[MIT](LICENSE). Splitwatch plays videos only through YouTube's official embedded player and is not
affiliated with or endorsed by YouTube or Google. YouTube is a trademark of Google LLC.

## Türkçe

Splitwatch, birden çok YouTube spor canlı yayınını tek pencerede yan yana izlemeye yarayan ücretsiz
ve açık kaynaklı bir masaüstü uygulamasıdır (Windows ve macOS). Şu an erken geliştirme aşamasındadır:
0.1.0 sürümü uygulamanın altyapısını, güncellemelerini ve dil desteğini kurar; yayın izleme sonraki
sürümlerde gelecek.

İndirmek için [Releases](https://github.com/MehmetBurakTaskaya/splitwatch/releases/latest) sayfasına
gidin. Uygulama henüz kod imzalı olmadığı için ilk açılışta uyarı çıkar:

- **Windows:** "Windows bilgisayarınızı korudu" uyarısında **Ek bilgi**'ye, sonra **Yine de çalıştır**'a
  tıklayın.
- **macOS:** `.dmg` dosyasını açıp Splitwatch'ı Uygulamalar klasörüne sürükleyin. İlk açılışta
  **Sistem Ayarları → Gizlilik ve Güvenlik** bölümünde **Yine de Aç**'a tıklayın ya da Terminal'de
  yukarıdaki `xattr` komutunu bir kez çalıştırın.

Windows'ta uygulama kendini günceller; macOS'ta yeni sürüm çıktığında indirme sayfasını açar.
