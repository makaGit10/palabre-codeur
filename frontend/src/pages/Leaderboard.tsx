import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Avatar, Flag } from '../components/Brand'
import { Icon } from '../components/Icon'
import { useI18n } from '../i18n'
import { currentMonth, formatFcfa, formatNumber } from '../lib/format'
import { localHint } from '../lib/money'
import { getLeaderboard } from '../services/community'

export default function Leaderboard() {
  const { t, country } = useI18n()
  const { data, isLoading } = useQuery({ queryKey: ['leaderboard'], queryFn: getLeaderboard })

  if (isLoading || !data) return <p className="py-16 text-center text-muted">{t('lb.loading')}</p>
  const max = data.countries[0]?.points ?? 1

  return (
    <div className="max-w-[1100px]">
      <h1 className="text-[26px]">{t('lb.title', { month: currentMonth() })}</h1>
      <p className="mt-1 mb-5 text-sm text-muted">{t('lb.subtitle')}</p>

      <section className="mb-5 rounded-[14px] border border-line bg-surface p-5">
        <h2 className="mb-4 flex items-center gap-2 text-base">
          <Icon name="trophy" />
          {t('lb.cup')}
        </h2>
        <ol className="flex flex-col gap-3">
          {data.countries.map((c, i) => (
            <li key={c.code} className="grid grid-cols-[20px_104px_1fr_64px] items-center gap-2 text-[13px] sm:grid-cols-[24px_140px_1fr_80px] sm:gap-3 sm:text-sm">
              <span className="font-display font-extrabold text-muted">{i + 1}</span>
              <span className="flex items-center gap-2 truncate">
                <Flag code={c.code} />
                {country(c.code)}
              </span>
              <span className="h-2.5 overflow-hidden rounded-full bg-sunk">
                <span
                  className={`block h-full rounded-full ${i === 0 ? 'bg-gold-bg' : 'bg-green'}`}
                  style={{ width: `${(c.points / max) * 100}%` }}
                />
              </span>
              <span className="text-right font-bold tabular-nums">{formatNumber(c.points)}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-[14px] border border-line bg-surface p-5">
        <h2 className="mb-3 flex items-center gap-2 text-base">
          <Icon name="user" />
          {t('lb.best')}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-2.5 py-2 font-semibold">#</th>
                <th className="px-2.5 py-2 font-semibold">{t('lb.dev')}</th>
                <th className="px-2.5 py-2 font-semibold">{t('lb.country')}</th>
                <th className="px-2.5 py-2 text-right font-semibold">{t('lb.reputation')}</th>
                <th className="px-2.5 py-2 text-right font-semibold">{t('lb.earned')}</th>
              </tr>
            </thead>
            <tbody>
              {data.developers.map((u, i) => (
                <tr key={u.id} className="border-b border-line tabular-nums last:border-0">
                  <td className="px-2.5 py-3 font-bold text-muted">{i + 1}</td>
                  <td className="px-2.5 py-3">
                    <Link to={`/app/profil/${u.id}`} className="inline-flex items-center gap-2 font-semibold hover:text-green">
                      <Avatar user={u} size="sm" />
                      {u.name}
                    </Link>
                  </td>
                  <td className="px-2.5 py-3">
                    <span className="inline-flex items-center gap-2">
                      <Flag code={u.country} />
                      {country(u.country)}
                    </span>
                  </td>
                  <td className="px-2.5 py-3 text-right font-semibold">{formatNumber(u.reputation)}</td>
                  <td className="px-2.5 py-3 text-right">
                    {u.bountyEarnings ? formatFcfa(u.bountyEarnings) : '–'}
                    {u.bountyEarnings > 0 && localHint(u.bountyEarnings, u.country) && (
                      <span className="block text-xs text-muted">{localHint(u.bountyEarnings, u.country)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
