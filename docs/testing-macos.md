# Testing on a Mac

CI builds and starts the macOS app, but YouTube treats data-center networks differently, so playback
needs a real Mac on a home or office network. This list grows with each phase.

## Install (once)

1. Download `Splitwatch-<version>-mac-universal.dmg` from the release.
2. Open it and drag **Splitwatch** into **Applications**.
3. Open Splitwatch. macOS refuses the first time. Open **System Settings → Privacy & Security**,
   scroll down and click **Open Anyway** next to Splitwatch, then confirm.

## Version 0.2 (about 10 minutes)

1. Paste `https://www.youtube.com/watch?v=M7lc1UVf-VE` into the box at the top and click **Add**.
   The video starts on its own, muted, and its title shows under it.
2. Click the title under the video: the sound comes on and the frame turns green.
3. Add three or four live streams (open any live stream on YouTube and copy its link; when you come
   back to Splitwatch it offers to add it). The grid grows to two by two.
4. Press **2**: you now hear stream 2. Press **M**: everything is muted; **M** again: sound is back.
5. Press **F**: stream 2 fills the screen. Press **Esc** to go back.
6. Drag stream 3 by its handle (the six dots) onto stream 1: they swap places, and neither restarts.
7. Click the layout buttons at the top, then press **L** a few times.
8. Press **?**: the shortcut list opens. Change one shortcut, then try it.
9. Quit with **Cmd + Q** and open Splitwatch again: the same streams come back.
10. Switch macOS between light and dark (**System Settings → Appearance**): the window follows.

If a tile shows a message instead of a video, note the message and the error code.

## Version 0.3 (about 10 more minutes)

1. Remove every stream: the start screen shows "Latest from your sports" with videos and thumbnails.
2. Press **Cmd + K**, type `final`: without a key, it asks for one.
3. Open **Settings** (the gear), follow "How to get a free key", paste the key and click **Save key**.
   macOS may ask whether Splitwatch may use the Keychain; allow it. Settings then says "The key works".
4. The start screen now says "Live now" and shows live streams with a red **LIVE** badge (if any of the
   preset channels is live). Add one: its tile shows **LIVE** under the player.
5. **Cmd + K**, type a sport (for example `volleyball`), click "Search YouTube for live streams" and
   add a result. Settings now shows "Searches: 1 of 100".
6. Quit and reopen: the key still works, without asking again.

Send back: your Mac model, macOS version, and what happened at each step (a screenshot helps:
**Shift + Cmd + 3**).
