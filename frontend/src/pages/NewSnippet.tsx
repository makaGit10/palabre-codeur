import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type KeyboardEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { Markdown } from '../components/Markdown'
import { useToast } from '../components/toastContext'
import { errorMessage } from '../lib/api'
import { createSnippet } from '../services/community'

// Langages proposés (libellé affiché → langage utilisé pour colorer le code).
// L'utilisateur peut aussi taper un langage absent de cette liste.
const LANGUAGES: { label: string; fence: string }[] = [
  { label: 'PHP · Laravel', fence: 'php' },
  { label: 'JavaScript · Node.js', fence: 'javascript' },
  { label: 'TypeScript', fence: 'typescript' },
  { label: 'Python', fence: 'python' },
  { label: 'Java · Spring', fence: 'java' },
  { label: 'Dart · Flutter', fence: 'dart' },
  { label: 'Kotlin', fence: 'kotlin' },
  { label: 'SQL', fence: 'sql' },
  { label: 'Bash', fence: 'bash' },
]

// API proposées. L'utilisateur peut en ajouter d'autres.
const SUGGESTED_APIS = [
  { id: 'wave', label: 'Wave' },
  { id: 'orange-money', label: 'Orange Money' },
  { id: 'mtn-momo', label: 'MTN MoMo' },
  { id: 'paytech', label: 'PayTech' },
  { id: 'free-money', label: 'Free Money' },
  { id: 'sms', label: 'SMS' },
  { id: 'livraison', label: 'Livraison' },
]

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

// Pour un langage tapé librement, on devine le nom utilisé par la coloration (ex. « Rust » → rust)
const TYPED_ALIASES: Record<string, string> = { 'c#': 'csharp', 'c++': 'cpp', golang: 'go', js: 'javascript', ts: 'typescript' }

function fenceFor(language: string) {
  const known = LANGUAGES.find((l) => l.label.toLowerCase() === language.trim().toLowerCase())
  if (known) return known.fence
  const word = language.trim().toLowerCase().split(/[\s·/]+/)[0]
  return TYPED_ALIASES[word] ?? (word.replace(/[^a-z0-9+#-]/g, '') || 'text')
}

type Errors = Partial<Record<'title' | 'description' | 'language' | 'tags' | 'code', string>>

export default function NewSnippet() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [language, setLanguage] = useState(LANGUAGES[0].label)
  const [apis, setApis] = useState(SUGGESTED_APIS)
  const [tags, setTags] = useState<string[]>([])
  const [apiInput, setApiInput] = useState('')
  const [code, setCode] = useState('')
  const [preview, setPreview] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const fence = fenceFor(language)
  // Un langage de la liste est sélectionné : le champ « Autre langage » reste vide
  const isKnownLanguage = LANGUAGES.some((l) => l.label === language)

  const mutation = useMutation({
    mutationFn: () =>
      createSnippet({
        title: title.trim(),
        description: description.trim(),
        language: language.trim(),
        fence,
        tags,
        code: code.replace(/\s+$/, ''),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['snippets'] })
      toast('Snippet publié · merci pour la communauté !')
      navigate('/app/snippets')
    },
    onError: (e) => toast(errorMessage(e), 'bell'),
  })

  const toggleTag = (id: string) => setTags(tags.includes(id) ? tags.filter((t) => t !== id) : [...tags, id])

  // Ajoute une API absente de la liste (ou sélectionne celle qui existe déjà sous ce nom)
  const addApi = () => {
    const label = apiInput.trim()
    const id = slug(label)
    if (!id) return
    const existing = apis.find((a) => a.id === id || a.label.toLowerCase() === label.toLowerCase())
    if (!existing) setApis([...apis, { id, label }])
    const finalId = existing?.id ?? id
    if (!tags.includes(finalId)) setTags([...tags, finalId])
    setApiInput('')
  }
  const onApiKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addApi()
    }
  }
  const removeCustomApi = (id: string) => {
    setApis(apis.filter((a) => a.id !== id))
    setTags(tags.filter((t) => t !== id))
  }
  const isCustom = (id: string) => !SUGGESTED_APIS.some((a) => a.id === id)

  const submit = () => {
    const next: Errors = {}
    if (title.trim().length < 10) next.title = 'Le titre doit faire au moins 10 caractères. Dites ce que fait le code.'
    if (description.trim().length < 15) next.description = 'Ajoutez une courte description (au moins 15 caractères).'
    if (!language.trim()) next.language = 'Choisissez un langage dans la liste ou tapez le vôtre.'
    if (!tags.length) next.tags = 'Choisissez ou ajoutez au moins une API concernée.'
    if (code.trim().split('\n').length < 2) next.code = 'Collez au moins 2 lignes de code.'
    setErrors(next)
    if (Object.keys(next).length === 0) mutation.mutate()
  }

  const input = (invalid?: string) =>
    `w-full rounded-[10px] border bg-surface px-3.5 py-2.5 outline-none focus:border-green focus:ring-3 focus:ring-green-soft ${invalid ? 'border-red' : 'border-line'}`
  const tab = (on: boolean) => `px-3 py-1.5 text-[13px] font-semibold rounded-md ${on ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`

  return (
    <div className="max-w-[860px]">
      <Link to="/app/snippets" className="mb-3.5 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-muted hover:text-ink">
        <Icon name="left" className="size-4" />
        Retour aux snippets
      </Link>
      <h1 className="text-[26px]">Partager un snippet</h1>
      <p className="mt-1 mb-5 text-sm text-muted">Un morceau de code court qui marche, pour éviter aux autres de chercher des heures.</p>

      <form
        noValidate
        className="flex flex-col gap-6 rounded-2xl border border-line bg-surface p-5 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <div>
          <label htmlFor="sn-title" className="mb-1.5 block text-sm font-bold">
            Titre
          </label>
          <input id="sn-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. : Vérifier la signature d'un webhook Wave" className={input(errors.title)} />
          {errors.title && <p className="mt-1.5 text-[13px] text-red">{errors.title}</p>}
        </div>

        <div>
          <label htmlFor="sn-desc" className="mb-1.5 block text-sm font-bold">
            À quoi sert ce code ?
          </label>
          <input
            id="sn-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex. : Refuse les notifications qui ne viennent pas vraiment de Wave."
            className={input(errors.description)}
          />
          {errors.description && <p className="mt-1.5 text-[13px] text-red">{errors.description}</p>}
        </div>

        <fieldset>
          <legend className="mb-1 text-sm font-bold">Langage</legend>
          <p className="mb-2 text-[12.5px] text-muted">Cliquez sur un langage, ou tapez le vôtre s'il n'est pas dans la liste.</p>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((l) => {
              const on = l.label === language
              return (
                <button
                  key={l.fence}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setLanguage(l.label)}
                  className={`rounded-[10px] border px-3 py-1.5 text-[13px] font-semibold ${
                    on ? 'border-green bg-green-soft text-green' : 'border-line bg-surface'
                  }`}
                >
                  {l.label}
                </button>
              )
            })}
          </div>
          <label htmlFor="sn-lang-other" className="mt-3 mb-1.5 block text-[12.5px] font-semibold text-muted">
            Autre langage
          </label>
          <input
            id="sn-lang-other"
            value={isKnownLanguage ? '' : language}
            onChange={(e) => setLanguage(e.target.value)}
            placeholder="Ex. : Rust, Elixir, Lua…"
            autoComplete="off"
            className={`${input(errors.language)} max-w-md ${!isKnownLanguage && language.trim() ? 'border-green ring-3 ring-green-soft' : ''}`}
          />
          {errors.language && <p className="mt-1.5 text-[13px] text-red">{errors.language}</p>}
        </fieldset>

        <fieldset>
          <legend className="mb-1 text-sm font-bold">API concernées</legend>
          <p className="mb-2 text-[12.5px] text-muted">Cliquez pour sélectionner. Votre API n'y est pas ? Ajoutez-la en dessous.</p>
          <div className="flex flex-wrap gap-2">
            {apis.map((a) => {
              const on = tags.includes(a.id)
              return (
                <span
                  key={a.id}
                  className={`inline-flex items-center rounded-[10px] border text-[13px] font-semibold ${
                    on ? 'border-green bg-green-soft text-green' : 'border-line bg-surface'
                  }`}
                >
                  <button type="button" aria-pressed={on} onClick={() => toggleTag(a.id)} className="py-1.5 pr-3 pl-3">
                    {a.label}
                  </button>
                  {isCustom(a.id) && (
                    <button
                      type="button"
                      aria-label={`Supprimer ${a.label}`}
                      onClick={() => removeCustomApi(a.id)}
                      className="-ml-1.5 py-1.5 pr-2.5 pl-1 font-bold opacity-70 hover:opacity-100"
                    >
                      ×
                    </button>
                  )}
                </span>
              )
            })}
          </div>
          <div className="mt-3 flex max-w-md gap-2">
            <input
              id="sn-api"
              value={apiInput}
              onChange={(e) => setApiInput(e.target.value)}
              onKeyDown={onApiKey}
              placeholder="Autre API : Moov Money, Flutterwave…"
              autoComplete="off"
              className={input()}
            />
            <button
              type="button"
              onClick={addApi}
              disabled={!apiInput.trim()}
              className="inline-flex items-center gap-1.5 rounded-[10px] border border-line px-3.5 text-sm font-semibold whitespace-nowrap hover:border-green hover:text-green disabled:opacity-40"
            >
              <Icon name="plus" className="size-4" />
              Ajouter
            </button>
          </div>
          {errors.tags && <p className="mt-1.5 text-[13px] text-red">{errors.tags}</p>}
        </fieldset>

        <div>
          <label htmlFor="sn-code" className="mb-1.5 block text-sm font-bold">
            Code
          </label>
          <div className={`overflow-hidden rounded-[10px] border ${errors.code ? 'border-red' : 'border-line focus-within:border-green'}`}>
            <div className="flex flex-wrap items-center gap-1 border-b border-line bg-sunk p-1">
              <button type="button" className={tab(!preview)} onClick={() => setPreview(false)}>
                Code
              </button>
              <button type="button" className={tab(preview)} onClick={() => setPreview(true)}>
                Aperçu coloré
              </button>
              <span className="ml-auto pr-2 text-xs text-muted">Ne mettez jamais de vraie clé API ni de mot de passe.</span>
            </div>
            {preview ? (
              <div className="[&_.md_pre]:rounded-none">
                {code.trim() ? (
                  <Markdown>{'```' + fence + '\n' + code + '\n```'}</Markdown>
                ) : (
                  <p className="px-4 py-6 text-sm text-muted">Rien à afficher pour l'instant.</p>
                )}
              </div>
            ) : (
              <textarea
                id="sn-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
                placeholder="Collez votre code ici…"
                className="block min-h-[240px] w-full resize-y bg-code-bg px-4 py-3 font-mono text-[13px] leading-relaxed text-code-ink outline-none"
              />
            )}
          </div>
          {errors.code && <p className="mt-1.5 text-[13px] text-red">{errors.code}</p>}
        </div>

        <div className="flex flex-wrap justify-end gap-2.5 border-t border-line pt-5">
          <Link to="/app/snippets" className="rounded-[10px] px-4 py-2.5 text-sm font-semibold hover:bg-sunk">
            Annuler
          </Link>
          <button disabled={mutation.isPending} className="rounded-[10px] bg-green px-4 py-2.5 text-sm font-semibold text-green-ink hover:brightness-110 disabled:opacity-60">
            {mutation.isPending ? 'Publication…' : 'Publier le snippet'}
          </button>
        </div>
      </form>
    </div>
  )
}
