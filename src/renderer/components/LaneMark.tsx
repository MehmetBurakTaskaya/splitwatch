// The lane mark: three lane stripes, the middle one in the text color.
export function LaneMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect className="lane-accent" x="4" y="5" width="3" height="14" rx="1" />
      <rect x="10.5" y="5" width="3" height="14" rx="1" fill="currentColor" />
      <rect className="lane-accent" x="17" y="5" width="3" height="14" rx="1" />
    </svg>
  );
}
