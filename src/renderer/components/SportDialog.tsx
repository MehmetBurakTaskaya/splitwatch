import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { openDialog, useAppStore } from '../state/app';
import { useSession } from '../state/session';
import { useYouTube } from '../state/youtube';
import { Dialog } from './Dialog';
import { SportIcon } from './sport-icons';

// Choice values besides the sports: let the app find the sport, or no sport at all.
const AUTO = 'auto';
const NONE = 'none';

// Picks the sport of one stream: found automatically, one of the preset sports, or none.
export function SportDialog() {
  const { t } = useTranslation();
  const videoId = useAppStore((s) => s.dialogStream);
  const index = useSession((s) => (videoId ? s.streams.indexOf(videoId) : -1));
  const own = useSession((s) => (videoId ? s.sports[videoId] : undefined));
  const found = useYouTube((s) => (videoId ? s.streamSports[videoId] : undefined));
  const presets = useYouTube((s) => s.presets);
  const sports = useMemo(
    () =>
      [...new Set(presets.map((p) => p.sport))].sort((a, b) => t(`sports.${a}`, a).localeCompare(t(`sports.${b}`, b))),
    [presets, t],
  );
  if (!videoId || index < 0) return null;

  const value = own ?? AUTO;
  const pick = (choice: string) => useSession.getState().setSport(videoId, choice === AUTO ? null : choice);
  const option = (choice: string, label: string, sport: string | null) => (
    <label key={choice}>
      <input type="radio" name="stream-sport" checked={value === choice} onChange={() => pick(choice)} />
      <SportIcon sport={sport} />
      {label}
    </label>
  );

  return (
    <Dialog title={t('sport.title', { index: index + 1 })} onClose={() => openDialog(null)} wide>
      <p className="note">{t('sport.note')}</p>
      <div className="sport-grid sport-choices" role="radiogroup" aria-labelledby="dialog-title">
        {option(
          AUTO,
          found ? t('sport.autoFound', { sport: t(`sports.${found}`, found) }) : t('sport.autoMissing'),
          null,
        )}
        {sports.map((sport) => option(sport, t(`sports.${sport}`, sport), sport))}
        {option(NONE, t('sport.none'), null)}
      </div>
      <div className="dialog-actions">
        <button type="button" className="button" onClick={() => openDialog(null)}>
          {t('sport.close')}
        </button>
      </div>
    </Dialog>
  );
}
