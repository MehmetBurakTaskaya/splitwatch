# Testing on a Mac

CI builds and starts the macOS app, but some checks need a real Mac on a home network (YouTube
treats data-center networks differently). This list grows with each phase.

## Version 0.1.0 (about 5 minutes)

1. Download `Splitwatch-<version>-mac-universal.dmg` from the release.
2. Open it and drag **Splitwatch** into **Applications**.
3. Open Splitwatch. macOS refuses the first time. Open **System Settings → Privacy & Security**,
   scroll down and click **Open Anyway** next to Splitwatch, then confirm.
4. The window shows "Splitwatch is on its way" and the version number.
5. Switch macOS between light and dark (**System Settings → Appearance**): the window follows.
6. When a newer release exists, the window says so and **Download** opens the release page.
7. Quit with **Cmd + Q**.

Send back: your Mac model, macOS version, and what happened at each step (a screenshot helps:
**Shift + Cmd + 3**).
