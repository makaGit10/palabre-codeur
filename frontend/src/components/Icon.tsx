const PATHS = {
  home: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  code: <path d="M8 7l-5 5 5 5M16 7l5 5-5 5" />,
  coin: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M15 9.5h-4.5a1.5 1.5 0 0 0 0 3h3a1.5 1.5 0 0 1 0 3H9" />
    </>
  ),
  trophy: <path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="M5 12l5 5 9-10" />,
  up: <path d="M6 15l6-6 6 6" />,
  down: <path d="M6 9l6 6 6-6" />,
  left: <path d="M15 6l-6 6 6 6" />,
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a1 1 0 0 1 1-1h10" />
    </>
  ),
  wallet: <path d="M4 7a2 2 0 0 1 2-2h11v3M4 7v11a2 2 0 0 0 2 2h14V8H6a2 2 0 0 1-2-1zM16 14h1" />,
  logout: <path d="M15 4h4v16h-4M10 16l4-4-4-4M14 12H4" />,
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  send: <path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />,
  more: (
    <>
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </>
  ),
  close: <path d="M18 6 6 18M6 6l12 12" />,
  spark: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />,
  bell: <path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 21a2 2 0 0 0 4 0" />,
  moon: <path d="M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10z" />,
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, className = 'size-[18px]' }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`flex-none ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {PATHS[name]}
    </svg>
  )
}
