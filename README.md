# Splitwatch

Watch several YouTube sports live streams side by side, in one window. Free and open source, for
Windows and macOS.

> **Early development.** Splitwatch plays a grid of streams, finds live sports on official channels,
> searches YouTube, dresses itself in the sport you watch, keeps your layouts, shrinks to a mini
> player and tells you when a channel goes live. More arrives version by version; see the
> [roadmap](docs/ROADMAP.md).

## What it does

- A grid of 1, 2, 3, 4, 6 or 9 streams, or one large stream with a side strip, each a "lane".
- Paste a YouTube link or video ID to add a stream; copy a link and Splitwatch offers to add it.
- The stream you pick is the one you hear; a main volume and a volume per stream.
- Enlarge one stream to fullscreen, drag streams to reorder them, and the grid comes back next time.
- Keyboard shortcuts for everything, and you can change them.
- "Live now": live and upcoming streams from the official channels of 17 sports (presets), with a
  LIVE badge on streams in the grid.
- Search YouTube for live streams (Ctrl + K, or Cmd + K on macOS), filtered by sport, with the cost
  shown before each search.
- Twelve sport themes, in light and dark, that follow the sport you watch (see below), and a
  light or dark button in the top bar.
- Saved layouts: save the grid under a name (Ctrl + S, or Cmd + S) and open it again later.
- A mini player: the picked stream in a small window that stays on top of other windows.
- Keep Splitwatch in the notification area (the menu bar on macOS) when its window closes, and start
  it when you sign in.
- Live notifications, with your own API key: Splitwatch tells you when a channel you follow, or an
  official channel of a sport you pick, goes live, and a click adds the stream.

## Playing by YouTube's rules

YouTube allows one player on a screen to start playing by itself, and no playback from a player you
cannot see. So when Splitwatch opens, only the stream you picked last starts; **Play all** in the top
bar starts the others. Streams you add start at once, since you asked for them. Streams pause while
they are out of sight (behind the enlarged stream, behind the mini player, or while the window is
minimized) and go on when they come back, live streams at their live edge. Closing the window stops
them all, also when Splitwatch stays in the notification area.

## Themes

Each theme has its own colors and a background drawn by the app: lane ropes for swimming, the bend
of a running track for athletics, waves for surfing, a slope with gates for alpine skiing, and so on.

| Theme       | Sport           | Theme    | Sport            |
| ----------- | --------------- | -------- | ---------------- |
| Pool        | Swimming        | Court    | Volleyball       |
| Track       | Athletics       | Beach    | Beach volleyball |
| Transition  | Triathlon       | Hardwood | Basketball       |
| Peloton     | Road cycling    | Swell    | Surfing          |
| Singletrack | Mountain biking | Rink     | Ice hockey       |
| Slalom      | Alpine skiing   | Halfpipe | Snowboarding     |

With **Automatic** (the default), the window takes the theme of the sport you watch. Streams added
from Live now or from a sport search know their sport; for others, Splitwatch looks for their channel
among the preset channels. When the streams show different sports, the window stays neutral and each
stream shows its own sport's color and icon. Click the icon under a stream to set its sport by hand.

The backgrounds show on the start screen, in empty places of the grid and in the thin gaps between
streams, never over a player. They move only while enough of them shows, and stop when the window is
hidden, when the system asks for reduced motion, or in **Performance mode** (Settings → Appearance).

Measured with `node scripts/measure-cpu.mjs` on an AMD Ryzen 9 7940HS laptop with Windows 11: the
CPU use of all of Splitwatch's processes, in percent of one core, averaged over 20 seconds.

| Situation                                    | Neutral | Swell theme | Swell, performance mode |
| -------------------------------------------- | ------- | ----------- | ----------------------- |
| Start screen, nothing playing                | 0.0 %   | 1.7 %       | 0.0 %                   |
| Four streams playing, two empty places shown | 2.2 %   | 2.8 %       | 2.1 %                   |

Swell, with seven moving rows of waves, is the busiest background; Pool, Track and Slalom measured
0.7 to 1.1 % on the start screen. When the players fill the grid, the background is drawn once and
costs nothing more.

## Your own YouTube API key (optional)

Splitwatch works without a key: you can paste links, and "Live now" shows the newest videos of the
preset channels. A free YouTube Data API key turns on search and shows which streams are live.

1. Open the [Google Cloud Console](https://console.cloud.google.com/apis/library/youtube.googleapis.com)
   and sign in with a Google account.
2. Create a project (any name), find **YouTube Data API v3** and click **Enable**.
3. Open **Credentials → Create credentials → API key** and copy the key. Restricting it to the YouTube
   Data API v3 is a good idea.
4. In Splitwatch, open **Settings → YouTube API key**, paste it and click **Save key**.

The key is encrypted by your system (the macOS Keychain, or Windows' Data Protection API) and only
sent to YouTube. A free key allows 100 searches and 10,000 other requests a day; Settings shows how
much is left, and Splitwatch stops before the limit.

## What is coming

- Special modes for the Summer and Winter Games.
- Eleven more interface languages.
- Extras such as spoiler protection, a calendar of upcoming streams and community themes.

## Keyboard shortcuts

| Key         | Action                                       |
| ----------- | -------------------------------------------- |
| 1 – 9       | Pick a stream (you hear it)                  |
| M           | Mute or unmute                               |
| F           | Enlarge the picked stream, fullscreen        |
| Esc         | Back to the grid (also from the mini player) |
| Space       | Play or pause the picked stream              |
| ← / →       | Back or forward 10 seconds                   |
| Alt + ← / → | Move the picked stream earlier or later      |
| L           | Next layout                                  |
| I           | Mini player                                  |
| ?           | Show the shortcuts (and change them)         |
| Ctrl/Cmd+K  | Find a stream                                |
| Ctrl/Cmd+S  | Save or open a layout                        |

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

Splitwatch is not affiliated with any sports body, league, team or broadcaster, and shows none of
their logos or marks; every theme picture and icon is its own. The theme headings use
[Oswald](https://github.com/googlefonts/OswaldFont) and [Exo 2](https://github.com/googlefonts/Exo-2.0),
under the SIL Open Font License 1.1 (the licenses ship with the app in `licenses/`).

## Türkçe

Splitwatch, birden çok YouTube spor canlı yayınını tek pencerede yan yana izlemeye yarayan ücretsiz
ve açık kaynaklı bir masaüstü uygulamasıdır (Windows ve macOS). Şu an erken geliştirme aşamasındadır:
YouTube linki ya da video kimliği yapıştırarak en fazla dokuz yayını bir grid'de izleyebilirsiniz;
seçtiğiniz yayının sesini duyarsınız. "Live now" 17 sporun resmî kanallarındaki yayınları gösterir;
kendi ücretsiz YouTube API anahtarınızla (Ayarlar → YouTube API key) canlı yayın araması ve LIVE
etiketleri de açılır. On iki spor teması, izlediğiniz sporun renklerini ve uygulamanın kendi çizdiği
bir arka planı getirir; ayarlar Ayarlar → Appearance bölümündedir. Düzenleri bir adla kaydedip
yeniden açabilir (Ctrl + S), seçili yayını diğer pencerelerin üstünde duran küçük bir mini
oynatıcıda izleyebilir (I), Splitwatch'ı pencere kapanınca bildirim alanında tutabilir ve oturum
açılınca başlatabilirsiniz. API anahtarınızla, takip ettiğiniz bir kanal canlı yayına başlayınca
bildirim alırsınız.

YouTube kuralları gereği açılışta yalnız son seçtiğiniz yayın kendiliğinden başlar; diğerlerini üst
çubuktaki **Play all** başlatır. Görünmeyen yayınlar (büyütülmüş yayının, mini oynatıcının arkasında
ya da pencere simge durumundayken) duraklar ve göründüklerinde devam eder.

İndirmek için [Releases](https://github.com/MehmetBurakTaskaya/splitwatch/releases/latest) sayfasına
gidin. Uygulama henüz kod imzalı olmadığı için ilk açılışta uyarı çıkar:

- **Windows:** "Windows bilgisayarınızı korudu" uyarısında **Ek bilgi**'ye, sonra **Yine de çalıştır**'a
  tıklayın.
- **macOS:** `.dmg` dosyasını açıp Splitwatch'ı Uygulamalar klasörüne sürükleyin. İlk açılışta
  **Sistem Ayarları → Gizlilik ve Güvenlik** bölümünde **Yine de Aç**'a tıklayın ya da Terminal'de
  yukarıdaki `xattr` komutunu bir kez çalıştırın.

Windows'ta uygulama kendini günceller; macOS'ta yeni sürüm çıktığında indirme sayfasını açar.
