import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LAYOUTS } from '../../shared/layouts';
import { parseVideoId } from '../../shared/youtube';
import { playAll } from '../player/players';
import { openDialog, useAppStore } from '../state/app';
import { setPrefs } from '../state/prefs';
import { type AddResult, useSession } from '../state/session';
import { useTheme } from '../theme/engine';
import { EventChip } from './EventChip';
import { ADD_INPUT_ID } from './Grid';
import {
  IconAlign,
  IconKeyboard,
  IconLayouts,
  IconMoon,
  IconMuted,
  IconPlay,
  IconSearch,
  IconSettings,
  IconSound,
  IconSun,
  LayoutGlyph,
} from './icons';
import { LaneMark } from './LaneMark';

export function TopBar() {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [message, setMessage] = useState<'invalid' | Exclude<AddResult, 'added'> | null>(null);
  const streams = useSession((s) => s.streams);
  const layout = useSession((s) => s.layout);
  const muted = useSession((s) => s.muted);
  const masterVolume = useSession((s) => s.masterVolume);
  const waiting = useSession((s) => s.waiting.length);
  const sync = useAppStore((s) => s.sync);
  const dark = useTheme((s) => s.scheme === 'dark');
  const schemeLabel = dark ? t('scheme.toLight') : t('scheme.toDark');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const id = parseVideoId(text);
    if (!id) return setMessage('invalid');
    const result = useSession.getState().add(id);
    if (result === 'added') {
      setText('');
      setMessage(null);
    } else {
      setMessage(result);
    }
  };

  return (
    <header className="topbar">
      <div className="brand">
        <LaneMark className="brand-mark" />
        <span className="brand-name">{t('app.name')}</span>
      </div>

      <form className="add" onSubmit={submit}>
        <input
          id={ADD_INPUT_ID}
          type="text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setMessage(null);
          }}
          placeholder={t('add.placeholder')}
          aria-label={t('add.label')}
          aria-invalid={message === 'invalid'}
          aria-describedby={message ? 'add-message' : undefined}
          spellCheck={false}
          autoComplete="off"
          // Links read left to right; while empty, the hint follows the page's direction.
          dir={text ? 'ltr' : undefined}
        />
        <button type="submit" className="button">
          {t('add.button')}
        </button>
        {message && (
          <span id="add-message" className="add-message" role="alert">
            {t(`add.${message}`)}
          </span>
        )}
      </form>

      {waiting > 0 && (
        <button
          type="button"
          className="button play-all"
          aria-label={t('playAll.button')}
          title={t('playAll.title', { count: waiting })}
          onClick={playAll}
        >
          <IconPlay />
          <span className="play-all-label">{t('playAll.button')}</span>
        </button>
      )}

      <EventChip />

      <button
        type="button"
        className="icon-button"
        aria-label={t('search.open')}
        title={t('search.open')}
        onClick={() => openDialog('search')}
      >
        <IconSearch />
      </button>

      <button
        type="button"
        className="icon-button"
        aria-label={t('layouts.title')}
        title={t('layouts.title')}
        onClick={() => openDialog('layouts')}
      >
        <IconLayouts />
      </button>

      <div className="layouts" role="group" aria-label={t('layout.label')}>
        {LAYOUTS.map((l) => (
          <button
            key={l.id}
            type="button"
            className="icon-button"
            aria-pressed={layout === l.id}
            aria-label={t(`layout.${l.id}`)}
            title={t(`layout.${l.id}`)}
            disabled={l.capacity < streams.length}
            onClick={() => useSession.getState().setLayout(l.id)}
          >
            <LayoutGlyph columns={l.columns} rows={l.rows} featured={l.id === 'featured'} />
          </button>
        ))}
      </div>

      {streams.length > 1 && (
        <button
          type="button"
          className="icon-button optional"
          aria-pressed={sync}
          aria-label={t('sync.open')}
          title={t('sync.open')}
          onClick={() => useAppStore.setState({ sync: !sync, chat: null })}
        >
          <IconAlign />
        </button>
      )}

      <div className="master">
        <button
          type="button"
          className="icon-button"
          aria-pressed={muted}
          aria-label={muted ? t('master.unmute') : t('master.mute')}
          title={muted ? t('master.unmute') : t('master.mute')}
          onClick={() => useSession.getState().toggleMute()}
        >
          {muted ? <IconMuted /> : <IconSound />}
        </button>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(masterVolume * 100)}
          aria-label={t('master.volume')}
          onChange={(e) => useSession.getState().setMasterVolume(Number(e.target.value) / 100)}
        />
      </div>

      <button
        type="button"
        className="icon-button optional scheme-toggle"
        aria-label={schemeLabel}
        title={schemeLabel}
        onClick={() => setPrefs({ colorScheme: dark ? 'light' : 'dark' })}
      >
        {dark ? <IconSun /> : <IconMoon />}
      </button>
      <button
        type="button"
        className="icon-button"
        aria-label={t('shortcuts.open')}
        title={t('shortcuts.open')}
        onClick={() => openDialog('shortcuts')}
      >
        <IconKeyboard />
      </button>
      <button
        type="button"
        className="icon-button"
        aria-label={t('settings.open')}
        title={t('settings.open')}
        onClick={() => openDialog('settings')}
      >
        <IconSettings />
      </button>
    </header>
  );
}
