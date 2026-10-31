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

## Version 0.4 (about 5 more minutes)

1. Open **Settings → Appearance** and click a few themes: the colors and the background change, with
   a short fade.
2. Under **Light or dark**, choose **Dark**: the window and its title bar turn dark. Then choose
   **Like the system** again.
3. Choose **Automatic**. Remove every stream, and under **Sports for Live now** tick only
   **Swimming**: the start screen shows the Pool theme, with light moving on the water.
4. Add two streams. Click the tag icon under each and pick **Basketball**: the window takes the
   Hardwood theme.
5. Turn on **Performance mode**: the background stops moving.

## Version 0.5 (about 10 more minutes)

1. With two streams in the grid, quit and reopen Splitwatch: only one stream plays, and **Play all**
   in the top bar starts the other.
2. Press **Cmd + S**, type a name and press **Return**. Remove a stream, press **Cmd + S** again and
   click **Open**: the grid comes back.
3. Press **I**: the window shrinks to the picked stream and stays above other windows (click another
   app to check). Press **Escape**: the grid comes back where it was.
4. In **Settings → In the background**, tick **Keep Splitwatch in the menu bar**. Close the window:
   the Splitwatch icon stays in the menu bar; its menu reopens the window.
5. Tick **Start Splitwatch when I sign in**. If Settings says macOS needs your approval, open
   **System Settings → General → Login Items** and allow it. Log out and in again.
6. With a key, turn on **Tell me when a stream goes live**: macOS should show a "Live notifications
   are on" notification. If Settings says the system did not show it, note that (macOS may refuse
   notifications from an app without a developer signature).

## Version 0.6 (about 5 more minutes)

1. Click the chip in the top bar (or, if none shows, any later version's chip) and pick **Winter
   Games 2026**. Click **Turn on the Winter Games mode**: a short animation plays, then the window
   shows the northern lights and snow.
2. Open the chip again, pick a day under **Schedule**, then open **Medals**: the medal table appears,
   with a link to its Wikipedia page.
3. Pick **Summer Games 2028** and turn its mode on: floodlights replace the northern lights.
4. Click **Turn off the mode**.

## Version 0.7 (about 5 more minutes)

1. Open **Settings**: the grid disappears and its streams pause; close Settings and they go on.
2. In **Settings → Appearance**, tick **Spoiler protection**: titles blur until you point at them.
3. Press **Cmd + S**, click the link icon next to a saved layout, then in Terminal run
   `open "<the copied link>"`: Splitwatch asks whether to open the layout.
4. In **Settings → Sound**, tick **Use the keyboard's media keys**. If Settings asks for it, allow
   Splitwatch under **System Settings → Privacy & Security → Accessibility**. Press the play/pause key
   with another app in front.

Send back: your Mac model, macOS version, and what happened at each step (a screenshot helps:
**Shift + Cmd + 3**). For 0.4, also whether the background moves smoothly and how busy Activity
Monitor shows Splitwatch on the start screen.
