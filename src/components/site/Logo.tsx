// Brand mark: three strata waves, traced from the supplied icon artwork.
// Colours are the icon's own wave tints, so the mark reads the same in the
// browser tab, on the home screen and inside the app.
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden>
      <path
        d="M6 20 19 14.5 30 18.5 43 13 55 16.2"
        stroke="#69d1e8"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 31 18.5 26.5 31 31.5 43 26 55.5 29"
        stroke="#4a8fa1"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 42 19 39.5 30.5 43.5 44 39.5 55 41.5"
        stroke="#3d7488"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
