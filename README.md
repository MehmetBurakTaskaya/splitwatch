# Splitwatch

Watch several YouTube sports live streams side by side, in one window. Free and open source, for
Windows and macOS.

> **Early development.** Splitwatch plays a grid of streams you add by link. Search, sport presets,
> themes and more arrive version by version; see the [roadmap](docs/ROADMAP.md).

## What it does

- A grid of 1, 2, 3, 4, 6 or 9 streams, or one large stream with a side strip, each a "lane".
- Paste a YouTube link or video ID to add a stream; copy a link and Splitwatch offers to add it.
- The stream you pick is the one you hear; a main volume and a volume per stream.
- Enlarge one stream to fullscreen, drag streams to reorder them, and the grid comes back next time.
- Keyboard shortcuts for everything, and you can change them.

## What is coming

- Search for live streams, curated presets per sport (no API key needed for the basics; your own
  free YouTube Data API key turns on search and live checks).
- Saved layouts, a small always-on-top mini mode, and notifications when followed channels go live.
- Hand-made visual themes per sport, and special modes for the Summer and Winter Games.
- Eleven more interface languages.

## Keyboard shortcuts

| Key         | Action                                  |
| ----------- | --------------------------------------- |
| 1 – 9       | Pick a stream (you hear it)             |
| M           | Mute or unmute                          |
| F           | Enlarge the picked stream, fullscreen   |
| Esc         | Back to the grid                        |
| Space       | Play or pause the picked stream         |
| ← / →       | Back or forward 10 seconds              |
| Alt + ← / → | Move the picked stream earlier or later |
| L           | Next layout                             |
| ?           | Show the shortcuts (and change them)    |

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
YouTube linki ya da video kimliği yapıştırarak en fazla dokuz yayını bir grid'de izleyebilirsiniz;
seçtiğiniz yayının sesini duyarsınız. Arama, spor hazır listeleri ve temalar sonraki sürümlerde gelecek.

İndirmek için [Releases](https://github.com/MehmetBurakTaskaya/splitwatch/releases/latest) sayfasına
gidin. Uygulama henüz kod imzalı olmadığı için ilk açılışta uyarı çıkar:

- **Windows:** "Windows bilgisayarınızı korudu" uyarısında **Ek bilgi**'ye, sonra **Yine de çalıştır**'a
  tıklayın.
- **macOS:** `.dmg` dosyasını açıp Splitwatch'ı Uygulamalar klasörüne sürükleyin. İlk açılışta
  **Sistem Ayarları → Gizlilik ve Güvenlik** bölümünde **Yine de Aç**'a tıklayın ya da Terminal'de
  yukarıdaki `xattr` komutunu bir kez çalıştırın.

Windows'ta uygulama kendini günceller; macOS'ta yeni sürüm çıktığında indirme sayfasını açar.
