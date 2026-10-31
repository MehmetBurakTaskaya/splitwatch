import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { layoutById } from '../../shared/layouts';
import { MAX_LAYOUT_NAME, MAX_SAVED_LAYOUTS, type SavedLayout } from '../../shared/settings';
import { openDialog } from '../state/app';
import { deleteLayout, linkOf, openLayout, renameLayout, restoreLayout, saveLayout } from '../state/layouts';
import { usePrefs } from '../state/prefs';
import { useSession } from '../state/session';
import { Dialog } from './Dialog';
import { IconDelete, IconLink, IconReady, IconRename, LayoutGlyph } from './icons';

export function LayoutsDialog() {
  const { t } = useTranslation();
  const layouts = usePrefs((s) => s.layouts);
  const hasStreams = useSession((s) => s.streams.length > 0);
  const [name, setName] = useState('');
  const [message, setMessage] = useState<{ text: string; problem: boolean } | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [removed, setRemoved] = useState<ReturnType<typeof deleteLayout>>(null);

  const save = (e: FormEvent) => {
    e.preventDefault();
    const result = saveLayout(name);
    const clean = name.trim();
    if (result === 'saved' || result === 'replaced') {
      setMessage({ text: t(`layouts.${result}`, { name: clean }), problem: false });
      setName('');
    } else {
      setMessage({ text: t(`layouts.${result}`, { max: MAX_SAVED_LAYOUTS }), problem: true });
    }
  };

  const copy = (link: string) => {
    window.splitwatch.copyText(link);
    setMessage({ text: t('layouts.copied'), problem: false });
  };

  // Escape while renaming stops the renaming instead of closing.
  const requestClose = () => (renaming ? setRenaming(null) : openDialog(null));

  return (
    <Dialog title={t('layouts.title')} onClose={requestClose} wide>
      <p className="layouts-ready">
        <button type="button" className="button button-quiet" onClick={() => openDialog('ready')}>
          <IconReady />
          {t('ready.title')}
        </button>
        <span className="note">{t('ready.fromLayouts')}</span>
      </p>
      <form className="layout-save" onSubmit={save}>
        <label htmlFor="layout-name">{t('layouts.nameLabel')}</label>
        <div className="layout-save-row">
          <input
            id="layout-name"
            type="text"
            value={name}
            maxLength={MAX_LAYOUT_NAME}
            placeholder={t('layouts.namePlaceholder')}
            disabled={!hasStreams}
            data-autofocus={hasStreams || undefined}
            autoComplete="off"
            dir="auto"
            onChange={(e) => {
              setName(e.target.value);
              setMessage(null);
            }}
          />
          <button type="submit" className="button" disabled={!hasStreams}>
            {t('layouts.save')}
          </button>
        </div>
        {hasStreams && (
          <button
            type="button"
            className="button button-quiet layout-copy-grid"
            onClick={() => {
              const { layout, streams, sports } = useSession.getState();
              copy(linkOf({ name: name.trim(), layout, streams, sports }));
            }}
          >
            <IconLink />
            {t('layouts.copyGrid')}
          </button>
        )}
        {!hasStreams && <p className="note">{t('layouts.empty')}</p>}
        {message && (
          <p className={message.problem ? 'dialog-problem' : 'note'} role={message.problem ? 'alert' : 'status'}>
            {message.text}
          </p>
        )}
      </form>

      <h3>{t('layouts.listTitle')}</h3>
      {removed && (
        <p className="layout-removed" role="status">
          {t('layouts.deleted', { name: removed.entry.name })}
          <button
            type="button"
            className="button button-quiet"
            onClick={() => {
              restoreLayout(removed);
              setRemoved(null);
            }}
          >
            {t('layouts.undo')}
          </button>
        </p>
      )}
      {layouts.length === 0 ? (
        <p className="note">{t('layouts.none')}</p>
      ) : (
        <ul className="saved-layouts">
          {layouts.map((entry) =>
            renaming === entry.id ? (
              <RenameRow key={entry.id} entry={entry} onDone={() => setRenaming(null)} />
            ) : (
              <li key={entry.id} className="saved-layout">
                <LayoutPreview entry={entry} />
                <span className="saved-layout-text">
                  <span className="saved-layout-name" dir="auto">
                    {entry.name}
                  </span>
                  <span className="saved-layout-meta">
                    {t('layouts.meta', { count: entry.streams.length, layout: t(`layout.${entry.layout}`) })}
                  </span>
                </span>
                <button
                  type="button"
                  className="button"
                  aria-label={t('layouts.openNamed', { name: entry.name })}
                  onClick={() => {
                    openLayout(entry.id);
                    openDialog(null);
                  }}
                >
                  {t('layouts.open')}
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={t('layouts.copyLink', { name: entry.name })}
                  title={t('layouts.copyLink', { name: entry.name })}
                  onClick={() => copy(linkOf(entry))}
                >
                  <IconLink />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={t('layouts.rename', { name: entry.name })}
                  title={t('layouts.rename', { name: entry.name })}
                  onClick={() => setRenaming(entry.id)}
                >
                  <IconRename />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={t('layouts.delete', { name: entry.name })}
                  title={t('layouts.delete', { name: entry.name })}
                  onClick={() => setRemoved(deleteLayout(entry.id))}
                >
                  <IconDelete />
                </button>
              </li>
            ),
          )}
        </ul>
      )}

      <div className="dialog-actions">
        <button type="button" className="button button-quiet" onClick={() => openDialog(null)}>
          {t('layouts.close')}
        </button>
      </div>
    </Dialog>
  );
}

function LayoutPreview({ entry }: { entry: SavedLayout }) {
  const { columns, rows } = layoutById(entry.layout);
  return (
    <span className="saved-layout-glyph" aria-hidden="true">
      <LayoutGlyph columns={columns} rows={rows} featured={entry.layout === 'featured'} />
    </span>
  );
}

function RenameRow({ entry, onDone }: { entry: SavedLayout; onDone: () => void }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(entry.name);
  const [problem, setProblem] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = renameLayout(entry.id, draft);
    if (result === 'renamed') onDone();
    else setProblem(t(result === 'taken' ? 'layouts.renameTaken' : 'layouts.invalid'));
  };

  return (
    <li className="saved-layout">
      <LayoutPreview entry={entry} />
      <form className="saved-layout-rename" onSubmit={submit}>
        <input
          type="text"
          value={draft}
          maxLength={MAX_LAYOUT_NAME}
          aria-label={t('layouts.renameLabel', { name: entry.name })}
          autoFocus
          autoComplete="off"
          dir="auto"
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            setDraft(e.target.value);
            setProblem(null);
          }}
        />
        <button type="submit" className="button">
          {t('layouts.renameSave')}
        </button>
        <button type="button" className="button button-quiet" onClick={onDone}>
          {t('layouts.renameCancel')}
        </button>
        {problem && (
          <p className="dialog-problem" role="alert">
            {problem}
          </p>
        )}
      </form>
    </li>
  );
}
