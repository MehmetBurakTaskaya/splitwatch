import { type KeyboardEvent, type MouseEvent, type ReactNode, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { IconClose } from './icons';

// A modal built on <dialog>, so focus is trapped natively. onClose is a request: Escape, the close
// button in the corner, a click outside the box and Enter on a checkbox or radio button (their
// changes apply at once) all ask the owner, which closes the dialog by no longer rendering it.
export function Dialog({
  title,
  onClose,
  wide,
  footer,
  children,
}: {
  title: string;
  onClose: () => void;
  wide?: boolean;
  // Shown under the scrolling content, always in view.
  footer?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDialogElement>(null);
  const pressedOutside = useRef(false);

  // showModal() would focus the close button, the first control. The focus goes to the control
  // marked data-autofocus instead, or else to the first one in the content.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    const first =
      dialog.querySelector<HTMLElement>('[data-autofocus]') ??
      dialog.querySelector<HTMLElement>(
        '.dialog-body :is(input:not([disabled]), button:not([disabled]), select, textarea, a[href], summary)',
      );
    first?.focus();
  }, []);

  // A click on the backdrop reaches the dialog element itself, outside its box.
  const outside = (e: MouseEvent) => {
    const dialog = ref.current;
    if (!dialog || e.target !== dialog) return false;
    const r = dialog.getBoundingClientRect();
    return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const target = e.target;
    if (e.key === 'Enter' && target instanceof HTMLInputElement && ['checkbox', 'radio'].includes(target.type)) {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <dialog
      ref={ref}
      className={wide ? 'dialog dialog-wide' : 'dialog'}
      aria-labelledby="dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // The browser may close it anyway (a second Escape); it stays open until its owner closes it.
      onClose={() => {
        const dialog = ref.current;
        if (dialog?.isConnected && !dialog.open) dialog.showModal();
      }}
      onPointerDown={(e) => (pressedOutside.current = outside(e))}
      onClick={(e) => {
        if (pressedOutside.current && outside(e)) onClose();
        pressedOutside.current = false;
      }}
      onKeyDown={onKeyDown}
    >
      <div className="dialog-head">
        <h2 id="dialog-title">{title}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label={t('dialog.close')}
          title={t('dialog.close')}
          onClick={onClose}
        >
          <IconClose />
        </button>
      </div>
      <div className="dialog-body">{children}</div>
      {footer && <div className="dialog-footer">{footer}</div>}
    </dialog>
  );
}
