import { type ReactNode, useEffect, useRef } from 'react';

// A modal built on <dialog>: focus is trapped and Escape closes it, natively.
export function Dialog({
  title,
  onClose,
  wide,
  children,
}: {
  title: string;
  onClose: () => void;
  wide?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className={wide ? 'dialog dialog-wide' : 'dialog'}
      aria-labelledby="dialog-title"
      onClose={onClose}
    >
      <h2 id="dialog-title">{title}</h2>
      {children}
    </dialog>
  );
}
