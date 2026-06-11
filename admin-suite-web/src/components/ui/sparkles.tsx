

export function Sparkles() {
  return (
    <span className="relative inline-flex h-6 w-6 items-center justify-center">
      <svg
        className="h-5 w-5 animate-pulse text-yellow-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707-.707M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z" />
      </svg>
    </span>
  );
}
