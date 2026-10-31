import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { type ElectronApplication, type Page, _electron as electron, expect, test } from '@playwright/test';

// Every view of the app is checked against WCAG 2.1 A and AA with axe-core, in light and dark. The
// YouTube players and chat are YouTube's own pages and stay out of the check.
const en = JSON.parse(readFileSync('src/renderer/i18n/locales/en.json', 'utf8'));
const VIDEO_A = 'M7lc1UVf-VE';
const VIDEO_B = 'aqz-KE-bpKQ';
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
// axe-core runs inside the page; Electron cannot open the extra page that its Playwright helper uses.
const AXE = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');

async function launch(settings: object, scheme: 'light' | 'dark', files: Record<string, unknown> = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'splitwatch-a11y-'));
  writeFileSync(
    path.join(dir, 'settings.json'),
    JSON.stringify({
      clipboardSuggestions: false,
      language: 'en',
      welcomeSeen: true,
      colorScheme: scheme,
      ...settings,
    }),
  );
  for (const [name, content] of Object.entries(files)) writeFileSync(path.join(dir, name), JSON.stringify(content));
  const app: ElectronApplication = await electron.launch({
    colorScheme: scheme,
    args: ['.'],
    env: { ...process.env, SPLITWATCH_NO_UPDATES: '1', SPLITWATCH_USER_DATA: dir },
  });
  const page: Page = await app.firstWindow();
  await page.waitForSelector('.topbar, .ambient');
  return { app, page };
}

type Violation = { id: string; impact: string | null; nodes: { target: string[]; failureSummary?: string }[] };

async function audit(page: Page, view: string): Promise<string[]> {
  // Let transitions and the backdrop settle so colors are final.
  await page.waitForTimeout(400);
  if (!(await page.evaluate(() => 'axe' in window))) await page.evaluate(AXE);
  const violations = await page.evaluate(async (tags) => {
    const axe = (window as unknown as { axe: { run: (c: unknown, o: unknown) => Promise<{ violations: unknown[] }> } })
      .axe;
    const result = await axe.run({ exclude: [['iframe']] }, { runOnly: { type: 'tag', values: tags }, iframes: false });
    return result.violations;
  }, TAGS);
  return (violations as Violation[]).flatMap((v) =>
    v.nodes.map(
      (n) =>
        `${view}: ${v.id} (${v.impact}) ${n.target.join(' ')}: ${(n.failureSummary ?? '').split(/\r?\n/)[1] ?? ''}`,
    ),
  );
}

for (const scheme of ['light', 'dark'] as const) {
  test(`every view meets WCAG 2.1 AA (${scheme})`, async () => {
    test.setTimeout(120_000);
    const problems: string[] = [];
    const now = Date.now();
    const today = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);

    // The start screen: the first-run guide, then the usual card and Live now.
    let { app, page } = await launch({ welcomeSeen: false }, scheme);
    problems.push(...(await audit(page, 'welcome')));
    await page.getByRole('button', { name: en.welcome.done }).click();
    problems.push(...(await audit(page, 'start')));
    await page.getByRole('button', { name: en.ambient.open }).click();
    problems.push(...(await audit(page, 'waiting screen')));
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: en.history.open }).click();
    problems.push(...(await audit(page, 'your watching')));
    await page.keyboard.press('Escape');
    await app.close();

    // The grid, its panels and the dialogs, with an event mode on.
    ({ app, page } = await launch(
      {
        event: { active: 'summer-2028', introSeen: ['summer-2028'] },
        session: { layout: '2', streams: [VIDEO_A, VIDEO_B], selected: VIDEO_A },
        reminders: [
          { videoId: VIDEO_B, title: 'Final', channel: 'Pool TV', at: new Date(now + 3_600_000).toISOString() },
        ],
      },
      scheme,
      {
        'watch.json': {
          entries: [
            {
              videoId: VIDEO_A,
              title: 'Heat 3',
              channel: 'Pool TV',
              sport: 'swimming',
              lastAt: now,
              seconds: 900,
              days: { [today]: 900 },
            },
          ],
          totals: { seconds: 900, sports: { swimming: 900 }, since: now },
        },
      },
    ));
    problems.push(...(await audit(page, 'grid')));
    await page.getByRole('button', { name: en.sync.open }).click();
    problems.push(...(await audit(page, 'line-up panel')));
    await page.getByRole('button', { name: en.sync.close }).click();
    for (const [view, open] of [
      ['settings', () => page.getByRole('button', { name: en.settings.open }).click()],
      ['shortcuts', () => page.getByRole('button', { name: en.shortcuts.open }).click()],
      ['layouts', () => page.getByRole('button', { name: en.layouts.title }).click()],
      ['search', () => page.getByRole('button', { name: en.search.open }).click()],
      ['event', () => page.locator('.event-chip').click()],
    ] as const) {
      await open();
      problems.push(...(await audit(page, view)));
      await page.keyboard.press('Escape');
      await expect(page.locator('dialog[open]')).toHaveCount(0);
    }
    await page.getByRole('button', { name: en.settings.open }).click();
    await page.getByRole('button', { name: en.settings.themeNew }).click();
    problems.push(...(await audit(page, 'theme editor')));
    await app.close();

    expect(problems).toEqual([]);
  });
}
