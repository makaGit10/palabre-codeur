import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'

// Affiche du Markdown en toute sécurité : le HTML brut éventuel n'est pas interprété
// breaks : un simple retour à la ligne devient un saut de ligne (pour les messages de discussion)
export function Markdown({ children, breaks = false }: { children: string; breaks?: boolean }) {
  return (
    <div className="md">
      <ReactMarkdown remarkPlugins={breaks ? [remarkGfm, remarkBreaks] : [remarkGfm]} rehypePlugins={[rehypeHighlight]}>
        {children}
      </ReactMarkdown>
    </div>
  )
}
