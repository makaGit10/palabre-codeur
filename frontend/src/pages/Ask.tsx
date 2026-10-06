import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type KeyboardEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { MarkdownEditor } from '../components/Post'
import { useToast } from '../components/toastContext'
import { useAuth } from '../hooks/useAuth'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useI18n } from '../i18n'
import { errorMessage, fieldErrors } from '../lib/api'
import { formatFcfa } from '../lib/format'
import { localHint, METHODS_BY_COUNTRY } from '../lib/money'
import { createQuestion, findSimilar } from '../services/questions'
import type { PaymentMethod } from '../types'

const BOUNTIES = [0, 500, 1000, 2000]
const POPULAR_TAGS = ['wave', 'orange-money', 'mtn-momo', 'paytech', 'laravel', 'react', 'flutter', 'nodejs', 'paie', 'sql', 'devops']
const MAX_TAGS = 4

type Errors = Partial<Record<'title' | 'body' | 'tags', string>>

export default function Ask() {
  const { t, payment } = useI18n()
  const { user } = useAuth()
  const country = user?.country ?? 'SN'
  // Seuls les moyens de paiement disponibles dans le pays de la personne connectée
  const METHODS: PaymentMethod[] = METHODS_BY_COUNTRY[country]
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [bounty, setBounty] = useState(0)
  const [method, setMethod] = useState<PaymentMethod>(METHODS[0])
  const [errors, setErrors] = useState<Errors>({})
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()

  // Détection de doublons pendant la frappe du titre
  const debouncedTitle = useDebouncedValue(title.trim(), 350)
  const { data: similar = [] } = useQuery({
    queryKey: ['similar', debouncedTitle],
    queryFn: () => findSimilar(debouncedTitle),
    enabled: debouncedTitle.length >= 6,
  })

  const addTag = (raw: string) => {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    if (!tag || tags.includes(tag) || tags.length >= MAX_TAGS) return
    setTags([...tags, tag])
    setTagInput('')
  }
  const onTagKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagInput)
    } else if (e.key === 'Backspace' && !tagInput && tags.length) {
      setTags(tags.slice(0, -1))
    }
  }

  const mutation = useMutation({
    mutationFn: () =>
      createQuestion({ title: title.trim(), body: body.trim(), tags, bounty: bounty ? { amount: bounty, method } : null }),
    onSuccess: ({ id }) => {
      queryClient.invalidateQueries({ queryKey: ['questions'] })
      toast(bounty ? t('ask.toast_bounty', { amount: formatFcfa(bounty), method: payment(method) }) : t('ask.toast'))
      navigate(`/app/questions/${id}`)
    },
    onError: (e) => {
      // Les erreurs du serveur s'affichent sous les champs concernés
      const fields = fieldErrors(e)
      setErrors({ title: fields.title, body: fields.body, tags: fields.tags ?? fields['tags.0'] })
      toast(errorMessage(e), 'bell')
    },
  })

  const submit = () => {
    const next: Errors = {}
    if (title.trim().length < 15) next.title = t('ask.err_title')
    if (body.trim().length < 20) next.body = t('ask.err_body')
    if (!tags.length) next.tags = t('ask.err_tags')
    setErrors(next)
    if (Object.keys(next).length === 0) mutation.mutate()
  }

  const showSimilar = title.trim().length >= 6 && similar.length > 0

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 max-w-[860px]">
        <Link to="/app" className="mb-3.5 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-muted hover:text-ink">
          <Icon name="left" className="size-4" />
          {t('common.back_feed')}
        </Link>
        <h1 className="text-[26px]">{t('ask.title')}</h1>
        <p className="mt-1 mb-5 text-sm text-muted">{t('ask.subtitle')}</p>

        <form
          noValidate
          className="flex flex-col gap-6 rounded-2xl border border-line bg-surface p-5 sm:p-6"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <div>
            <label htmlFor="ask-title" className="mb-1 block text-sm font-bold">
              {t('ask.title_label')}
            </label>
            <p className="mb-2 text-[12.5px] text-muted">{t('ask.title_hint')}</p>
            <input
              id="ask-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('ask.title_placeholder')}
              autoComplete="off"
              aria-invalid={!!errors.title}
              className={`w-full rounded-[10px] border bg-surface px-3.5 py-2.5 outline-none focus:border-green focus:ring-3 focus:ring-green-soft ${
                errors.title ? 'border-red' : 'border-line'
              }`}
            />
            {errors.title && <p className="mt-1.5 text-[13px] text-red">{errors.title}</p>}
            {showSimilar && (
              <div className="mt-2.5 rounded-xl border border-green/35 bg-green-soft p-3">
                <p className="flex items-center gap-2 text-[13px] font-bold text-green">
                  <Icon name="spark" />
                  {t('ask.similar')}
                </p>
                {similar.map((s) => (
                  <Link
                    key={s.id}
                    to={`/app/questions/${s.id}`}
                    className="mt-2 flex justify-between gap-3 rounded-[9px] border border-line bg-surface px-3 py-2 text-[13.5px] font-semibold hover:border-green"
                  >
                    {s.title}
                    <small className="font-medium whitespace-nowrap text-muted">{s.solved ? t('ask.solved_mark') : t('ask.answers_short', { n: s.answersCount })}</small>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="ask-body" className="mb-1 block text-sm font-bold">
              {t('ask.details')}
            </label>
            <p className="mb-2 text-[12.5px] text-muted">{t('ask.details_hint')}</p>
            <MarkdownEditor id="ask-body" value={body} onChange={setBody} invalid={!!errors.body} placeholder={t('ask.details_placeholder')} />
            {errors.body && <p className="mt-1.5 text-[13px] text-red">{errors.body}</p>}
          </div>

          <div>
            <label htmlFor="ask-tags" className="mb-1 block text-sm font-bold">
              {t('ask.tags')}
            </label>
            <p className="mb-2 text-[12.5px] text-muted">{t('ask.tags_hint', { max: MAX_TAGS })}</p>
            <div
              className={`flex flex-wrap items-center gap-1.5 rounded-[10px] border bg-surface px-2.5 py-2 focus-within:border-green ${
                errors.tags ? 'border-red' : 'border-line'
              }`}
            >
              {tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-green-soft py-0.5 pr-1 pl-2 font-mono text-xs text-green">
                  {tag}
                  <button type="button" aria-label={t('ask.remove_tag', { tag })} onClick={() => setTags(tags.filter((x) => x !== tag))} className="px-1 font-bold">
                    ×
                  </button>
                </span>
              ))}
              {tags.length < MAX_TAGS && (
                <input
                  id="ask-tags"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={onTagKey}
                  onBlur={() => addTag(tagInput)}
                  placeholder={tags.length ? '' : 'wave, laravel…'}
                  className="min-w-[120px] flex-1 bg-transparent py-0.5 text-sm outline-none"
                />
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {POPULAR_TAGS.filter((tag) => !tags.includes(tag))
                .slice(0, 8)
                .map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => addTag(tag)}
                    disabled={tags.length >= MAX_TAGS}
                    className="rounded-md border border-dashed border-line px-2 py-0.5 font-mono text-[11.5px] text-muted hover:border-green hover:text-green disabled:opacity-40"
                  >
                    + {tag}
                  </button>
                ))}
            </div>
            {errors.tags && <p className="mt-1.5 text-[13px] text-red">{errors.tags}</p>}
          </div>

          <fieldset>
            <legend className="mb-1 text-sm font-bold">
              {t('ask.bounty')} <span className="font-medium text-muted">{t('common.optional')}</span>
            </legend>
            <p className="mb-2.5 text-[12.5px] text-muted">{t('ask.bounty_hint')}</p>
            <div className="flex flex-wrap gap-2">
              {BOUNTIES.map((a) => (
                <button
                  key={a}
                  type="button"
                  aria-pressed={bounty === a}
                  onClick={() => setBounty(a)}
                  className={`rounded-[10px] border px-3.5 py-2 text-[13.5px] font-semibold ${
                    bounty === a ? 'border-gold-bg bg-gold-soft text-gold' : 'border-line bg-surface'
                  }`}
                >
                  {a ? formatFcfa(a) : t('ask.no_bounty')}
                  {a > 0 && localHint(a, country) && <span className="ml-1 font-normal opacity-75">{localHint(a, country)}</span>}
                </button>
              ))}
            </div>
            {bounty > 0 && (
              <>
                <p className="mt-4 mb-2 text-[12.5px] text-muted">{t('ask.pay_with')}</p>
                <div className="flex flex-wrap gap-2">
                  {METHODS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={method === m}
                      onClick={() => setMethod(m)}
                      className={`rounded-[10px] border px-3.5 py-2 text-[13.5px] font-semibold ${
                        method === m ? 'border-green bg-green-soft text-green' : 'border-line bg-surface'
                      }`}
                    >
                      {payment(m)}
                    </button>
                  ))}
                </div>
                <p className="mt-3 flex items-start gap-2 text-[12.5px] text-muted">
                  <Icon name="check" className="mt-0.5 size-4 text-green" />
                  {t('ask.bounty_note')}
                </p>
              </>
            )}
          </fieldset>

          <div className="flex flex-wrap justify-end gap-2.5 border-t border-line pt-5">
            <Link to="/app" className="rounded-[10px] px-4 py-2.5 text-sm font-semibold hover:bg-sunk">
              {t('common.cancel')}
            </Link>
            <button disabled={mutation.isPending} className="rounded-[10px] bg-green px-4 py-2.5 text-sm font-semibold text-green-ink hover:brightness-110 disabled:opacity-60">
              {mutation.isPending ? t('common.publishing') : bounty ? t('ask.pay_and_publish', { amount: formatFcfa(bounty) }) : t('ask.publish')}
            </button>
          </div>
        </form>
      </div>

      <aside className="sticky top-7 hidden rounded-[14px] border border-line bg-surface p-5 xl:block">
        <h2 className="mb-3 text-base">{t('ask.tips_title')}</h2>
        <ol className="flex list-decimal flex-col gap-2.5 pl-5 text-sm text-muted">
          <li>
            <b className="text-ink">{t('ask.tip1_b')}</b>
            {t('ask.tip1')}
          </li>
          <li>
            <b className="text-ink">{t('ask.tip2_b')}</b>
            {t('ask.tip2')}
          </li>
          <li>
            <b className="text-ink">{t('ask.tip3_b')}</b>
            {t('ask.tip3')}
          </li>
          <li>
            <b className="text-ink">{t('ask.tip4_b')}</b>
            {t('ask.tip4')}
          </li>
        </ol>
      </aside>
    </div>
  )
}
