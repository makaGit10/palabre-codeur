import { Link } from 'react-router-dom'

// Page temporaire pour les écrans pas encore développés
export default function ComingSoon({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-2xl">{title}</h1>
      <p className="mt-2 text-muted">Cet écran arrive dans les prochaines étapes du développement.</p>
      <Link to="/app" className="mt-6 inline-block font-semibold text-green">
        Retour au fil
      </Link>
    </div>
  )
}
