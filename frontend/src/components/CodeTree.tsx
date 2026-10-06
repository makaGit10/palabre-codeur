import type { CSSProperties } from 'react'

// Générateur pseudo-aléatoire déterministe : l'arbre est identique à chaque affichage
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Centres des touffes de feuillage, au bout des branches (x, y, rayon)
const CLUSTERS: [number, number, number][] = [
  [150, 150, 46], [128, 108, 40], [205, 112, 44], [250, 76, 48], [300, 62, 50], [352, 78, 48],
  [398, 112, 44], [470, 108, 40], [452, 150, 46], [300, 118, 42], [225, 160, 34], [378, 160, 34],
]
const LEAF_SHADES = ['#0A4F39', '#0E6B4E', '#13805D', '#22A174']

const rand = seeded(7)
const LEAVES = CLUSTERS.flatMap(([cx, cy, radius]) =>
  Array.from({ length: 10 }, () => {
    const angle = rand() * Math.PI * 2
    const dist = rand() * radius * 0.78
    return { x: cx + Math.cos(angle) * dist, y: cy + Math.sin(angle) * dist * 0.8, r: 11 + rand() * 20 }
  }),
)
  .sort((a, b) => b.y - a.y) // on dessine du bas vers le haut : le haut, plus clair, recouvre le bas
  .map((leaf) => {
    const light = Math.min(3, Math.max(0, Math.floor((1 - (leaf.y - 30) / 170) * 4 + (rand() - 0.5))))
    return { ...leaf, fill: LEAF_SHADES[light] }
  })

// Fruits du baobab (« pain de singe ») suspendus sous le feuillage
const FRUITS: [number, number, number][] = [
  [172, 182, 22], [262, 140, 18], [338, 146, 24], [430, 184, 20], [214, 196, 16],
]

const TOKENS = ['</>', '{ }', '=>', 'const', 'fn()', '01', '[ ]', 'git push', 'wave.pay()', 'npm i', '200 OK', '&&', 'SELECT *', 'async', '#!', '<div>', 'return', '++']

const dropRand = seeded(42)
const DROPS = Array.from({ length: 18 }, (_, i) => {
  const dur = 7 + dropRand() * 6
  return {
    token: TOKENS[i % TOKENS.length],
    style: {
      left: `${20 + dropRand() * 58}%`,
      '--start': `${22 + dropRand() * 14}%`,
      '--dur': `${dur}s`,
      '--delay': `${-dropRand() * dur}s`, // délai négatif : la pluie de code est déjà en cours au chargement
      '--sway': `${(dropRand() - 0.5) * 60}px`,
      '--rot': `${(dropRand() - 0.5) * 80}deg`,
      fontSize: `${11 + dropRand() * 5}px`,
      color: i % 3 === 0 ? 'var(--gold)' : 'var(--green)',
    } as CSSProperties,
  }
})

export function CodeTree() {
  return (
    <div className="relative mx-auto aspect-[600/520] w-full max-w-[680px]">
      <svg viewBox="0 0 600 520" className="absolute inset-0 size-full" role="img" aria-label="Un baobab d'où tombent des morceaux de code">
        <defs>
          <linearGradient id="bark" x1="0" x2="1">
            <stop offset="0" stopColor="#5A3820" />
            <stop offset=".45" stopColor="#8E6443" />
            <stop offset="1" stopColor="#4E301B" />
          </linearGradient>
          <radialGradient id="ground" cx=".5" cy=".5" r=".5">
            <stop offset="0" stopColor="rgb(0 0 0 / .22)" />
            <stop offset="1" stopColor="rgb(0 0 0 / 0)" />
          </radialGradient>
        </defs>

        <ellipse cx="300" cy="486" rx="230" ry="22" fill="url(#ground)" />

        {/* Branches */}
        <g stroke="#6B4528" strokeLinecap="round" fill="none">
          <path d="M262 236 C238 196 204 174 156 152" strokeWidth="22" />
          <path d="M204 172 C188 146 168 124 132 110" strokeWidth="12" />
          <path d="M282 230 C276 186 262 140 248 92" strokeWidth="18" />
          <path d="M300 228 C300 184 302 130 300 74" strokeWidth="16" />
          <path d="M318 230 C324 186 340 140 354 92" strokeWidth="18" />
          <path d="M338 236 C362 196 396 174 446 152" strokeWidth="22" />
          <path d="M398 172 C414 146 434 124 468 110" strokeWidth="12" />
          <path d="M246 186 C228 172 216 160 206 140" strokeWidth="8" />
          <path d="M354 186 C372 172 384 160 394 140" strokeWidth="8" />
        </g>

        {/* Tronc en forme de bouteille, typique du baobab */}
        <path d="M212 486 C196 432 188 360 220 298 C238 262 248 244 252 226 L348 226 C352 244 362 262 380 298 C412 360 404 432 388 486 Z" fill="url(#bark)" />
        <g stroke="#3E2615" strokeOpacity=".35" strokeWidth="2.5" fill="none" strokeLinecap="round">
          <path d="M246 476 C236 420 238 350 262 300" />
          <path d="M282 480 C278 420 280 360 290 262" />
          <path d="M318 480 C322 420 320 360 312 262" />
          <path d="M354 476 C364 420 362 350 338 300" />
          <path d="M228 400 C232 370 240 350 250 336" />
          <path d="M372 400 C368 370 360 350 350 336" />
        </g>
        <path d="M212 486 C204 470 196 474 186 486 M388 486 C396 470 404 474 414 486" stroke="#4E301B" strokeWidth="10" strokeLinecap="round" fill="none" />

        {/* Feuillage qui se balance doucement */}
        <g className="canopy">
          {LEAVES.map((l, i) => (
            <circle key={i} cx={l.x.toFixed(1)} cy={l.y.toFixed(1)} r={l.r.toFixed(1)} fill={l.fill} />
          ))}
          {FRUITS.map(([x, y, len], i) => (
            <g key={i}>
              <path d={`M${x} ${y - len} L${x} ${y}`} stroke="#5A3820" strokeWidth="1.5" />
              <ellipse cx={x} cy={y + 9} rx="6" ry="11" fill="#C9A66B" stroke="#8E6E3E" strokeWidth="1" />
            </g>
          ))}
        </g>
      </svg>

      {/* Pluie de code qui tombe du feuillage */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {DROPS.map((d, i) => (
          <span key={i} className="code-drop font-mono font-semibold" style={d.style}>
            {d.token}
          </span>
        ))}
      </div>

      {/* Bulles de discussion */}
      <div className="float-slow absolute top-[44%] left-0 rounded-[10px] border border-line bg-surface px-3 py-2 text-xs font-bold shadow-lg sm:text-[13px]">
        Webhook Wave ? 🤔
      </div>
      <div className="float-slow-2 absolute right-0 bottom-[14%] rounded-[10px] border border-line bg-surface px-3 py-2 text-xs font-bold text-green shadow-lg sm:text-[13px]">
        ✓ Résolu · +1 000 FCFA
      </div>
    </div>
  )
}
