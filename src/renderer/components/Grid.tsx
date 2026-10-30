import { type CSSProperties, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { layoutById, minContentSize } from '../../shared/layouts';
import { useAppStore } from '../state/app';
import { useSession } from '../state/session';
import { IconAdd } from './icons';
import { Tile } from './Tile';

export const ADD_INPUT_ID = 'add-stream-input';

export function Grid() {
  const { t } = useTranslation();
  const streams = useSession((s) => s.streams);
  const layoutId = useSession((s) => s.layout);
  const maximized = useSession((s) => s.maximized);
  const mini = useAppStore((s) => s.mini);
  const [dragging, setDragging] = useState(false);
  const layout = layoutById(layoutId);

  // Keep every player at least 200 x 200 px in this layout (mini mode sets its own minimum, and
  // the layout's minimum applies again when it ends).
  useEffect(() => {
    if (!mini) window.splitwatch.setMinContentSize(minContentSize(layoutId));
  }, [layoutId, mini]);

  // Tiles stay in a fixed DOM order (sorted by ID) and are placed with CSS order, because moving an
  // iframe in the DOM reloads it and restarts the stream.
  const domOrder = useMemo(() => [...streams].sort(), [streams]);
  const empty = maximized || mini ? 0 : Math.max(0, layout.capacity - streams.length);

  return (
    <div
      className={['grid', `layout-${layoutId}`, maximized && 'maximized', mini && 'mini', dragging && 'dragging']
        .filter(Boolean)
        .join(' ')}
      style={{ '--columns': layout.columns, '--rows': layout.rows } as CSSProperties}
      data-layout={layoutId}
    >
      {domOrder.map((id) => (
        <Tile key={id} videoId={id} index={streams.indexOf(id)} onDragActive={setDragging} />
      ))}
      {Array.from({ length: empty }, (_, i) => (
        <button
          key={`slot-${i}`}
          type="button"
          className="slot"
          style={{ order: streams.length + i }}
          data-slot={streams.length + i}
          onClick={() => document.getElementById(ADD_INPUT_ID)?.focus()}
        >
          <span className="slot-label">
            <IconAdd />
            {t('empty.slot')}
          </span>
        </button>
      ))}
    </div>
  );
}
