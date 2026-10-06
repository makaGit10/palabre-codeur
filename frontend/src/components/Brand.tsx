import { Link } from 'react-router-dom'
import type { CountryCode, User } from '../types'

const AVATAR_COLORS = ['#0E6B4E', '#B5512A', '#3A5BA9', '#8A3FA0', '#B87D06', '#2C7F8C', '#A23B5A']

export function Logo({ to = '/', showName = true }: { to?: string; showName?: boolean }) {
  return (
    <Link to={to} className="flex items-center gap-2.5 font-display text-[21px] font-extrabold text-ink" aria-label="Palabre">
      <svg viewBox="0 0 40 40" className="size-[30px] flex-none" aria-hidden="true">
        <circle cx="20" cy="20" r="19" style={{ fill: 'var(--green)' }} />
        <path
          d="M18 34c.5-5 .3-9-1-13M22 34c-.4-5 0-9 1.5-13M17 21c-3-1-5-3-6-5M23.5 21c3-1 5-3 6-5M20 21v-5"
          style={{ stroke: 'var(--green-ink)' }}
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />
        <ellipse cx="20" cy="13" rx="11" ry="5.5" style={{ fill: 'var(--gold-bg)' }} />
      </svg>
      {showName && <span>Palabre</span>}
    </Link>
  )
}

export function Flag({ code }: { code: CountryCode }) {
  return <span className={`flag flag-${code}`} aria-hidden="true" />
}

const SIZES = { sm: 'size-6 text-[10px]', md: 'size-[34px] text-[13px]', lg: 'size-[72px] text-[26px]' }

export function Avatar({ user, size = 'md' }: { user: User; size?: keyof typeof SIZES }) {
  const initials = user.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
  return (
    <span
      className={`grid flex-none place-items-center rounded-full font-bold text-white ${SIZES[size]}`}
      style={{ background: AVATAR_COLORS[user.id % AVATAR_COLORS.length] }}
    >
      {initials}
    </span>
  )
}
