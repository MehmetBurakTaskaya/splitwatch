# ADR 0013: Updates always on, only the newest release, download numbers

- Status: accepted
- Date: 2026-10-31

## Context

The owner decided on 2026-10-31 that Splitwatch handles updates, releases and download numbers the
way the owner's other app, Panopin, does: every copy keeps itself up to date, only the newest version
can be downloaded, and the owner can see how many people download and use the app, without the app
sending anything about them. This changes ADR 0009 (the portable Windows copy and macOS offered the
download page) and the update switch of 1.0.0 (ADR 0012).

## Decision

**Updates are always on.** The switch in Settings is gone (a stored value is ignored). Splitwatch
looks for a new version 30 seconds after it starts, every 6 hours, and an hour after a check that
failed; Settings → Updates says so, has **Check now**, and shows where things stand. A new version
downloads by itself and installs while nobody is watching: when the app closes, or at once when it
waits in the tray with no window open, in which case it starts again in the tray (a marker file in the
settings folder tells the new start to stay hidden). **Update and restart** installs at once. The
first-run guide and the privacy policy say that the app goes online for this and sends nothing about
the user.

- The installed Windows copy and the Linux AppImage use electron-updater; it installs silently when
  the app closes, or with `quitAndInstall(true, true)` for an install now.
- The portable Windows copy reads `latest-portable.yml` (the version, the ZIP and its SHA-512, written
  by `scripts/portable-yml.mjs`), downloads and checks the ZIP and unpacks it. The new version then
  puts itself in place: Splitwatch starts the unpacked `Splitwatch.exe` with `--apply-update` and
  quits, and that copy, which opens no window, waits for the old one to close, copies its files over
  the folder (it adds and replaces files and never deletes, since the folder may hold anything) and
  starts it again. A script was the first plan, but PowerShell started without a console quits at
  once, and one started with a console shows a window. The next check removes the download folder.
  Every later version reads the same `--apply-update` arguments, since an older version starts a newer
  one.
- A Mac copy reads `latest-mac.yml`, downloads and checks the update ZIP and unpacks it with `ditto`.
  Once Splitwatch has quit, a shell script moves the old bundle aside, puts the new one in place (or
  the old one back if that fails) and opens it. Squirrel.Mac would need a paid certificate; the
  download made by the app carries no quarantine flag, so the new bundle opens without Gatekeeper's
  question. An app opened where it was downloaded runs translocated and cannot replace itself: it asks
  to be moved to Applications. Each build has its own ad-hoc signature, so macOS may ask again for
  the media keys' Accessibility permission after an update.
- A Linux build outside an AppImage, and a copy whose folder is not writable, point to the download
  page.

**Only the newest release.** Publishing a release turns every older published release into a draft
(`hide-old-releases.yml`): drafts keep their files and download counts, only the owner sees them, and
publishing one again brings it back. File names carry no version (`Splitwatch-Setup-x64.exe`,
`Splitwatch-Portable-x64.zip`, `Splitwatch-macOS.dmg`, `Splitwatch-x86_64.AppImage`), so
`releases/latest/download/<name>` always gives the newest file.

**Download numbers.** Splitwatch sends nothing; the numbers are the counts GitHub keeps for each
release file. `npm run stats`, or Actions → Download numbers, lists them per release: people's
downloads (the installer, the portable ZIP, the `.dmg`, the AppImage), updates, and reads of the
`latest*.yml` files. Updates fetch copies under their own names (`Splitwatch-Update-x64.exe`,
`Splitwatch-Update-x86_64.AppImage`, and `Splitwatch-macOS.zip`, which people do not need), so the
two are told apart; portable copies update from the portable ZIP, which counts with people's
downloads. Every running copy reads a `latest*.yml` at start and every 6 hours, 2 to 4 times a day,
so the reads per day divided by 4 and by 2 bound the copies in use. These count downloads, not people.

## Consequences

- An update can restart the app while it waits in the tray; nothing plays then.
- SignPath's conditions ask for a way to turn off features that send data, which the update check no
  longer has; signing through SignPath would need this decision revisited.
- The release workflow uploads the update copies and `latest-portable.yml` after electron-builder;
  a change of file names must change both, and `scripts/stats.mjs`.
