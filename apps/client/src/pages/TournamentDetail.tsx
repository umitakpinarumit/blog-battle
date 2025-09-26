import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api/client'

type Tournament = { _id: string; name: string; category?: string; status: 'draft'|'ongoing'|'finished'; rounds: string[][]; currentRound: number }

type MatchView = {
  _id: string
  round: number
  status: 'ongoing'|'finished'
  aTitle: string
  bTitle: string
  aImage?: string
  bImage?: string
  percentA: number
  percentB: number
  isBye?: boolean
}

export default function TournamentDetail() {
  const { id } = useParams()
  const [t, setT] = useState<Tournament | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rounds, setRounds] = useState<MatchView[][]>([])
  const gridRef = useRef<HTMLDivElement | null>(null)
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [links, setLinks] = useState<Array<{ from: { x: number, y: number }, to: { x: number, y: number } }>>([])

  async function load() {
    try {
      setLoading(true)
      const { data } = await api.get(`/tournaments/${id}`)
      const tt: Tournament = data.tournament
      setT(tt)
      const rViews: MatchView[][] = []
      for (let i = 0; i < tt.rounds.length; i++) {
        const mids = tt.rounds[i]
        const views: MatchView[] = []
        for (const mid of mids) {
          try {
            const mres = await api.get(`/matches/${mid}`)
            const m = mres.data.match
            const stats = mres.data.stats
            const [a, b] = await Promise.all([
              api.get(`/posts/${m.postAId}`),
              api.get(`/posts/${m.postBId}`),
            ])
            const isBye = String(m.postAId) === String(m.postBId)
            views.push({ _id: m._id, round: m.round, status: m.status, aTitle: a.data.title, bTitle: b.data.title, aImage: a.data.imageUrl, bImage: b.data.imageUrl, percentA: stats.percentA, percentB: stats.percentB, isBye })
          } catch {}
        }
        rViews.push(views)
      }
      setRounds(rViews)
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Yüklenemedi')
    } finally { setLoading(false) }
  }

  useEffect(() => {
    load()
    const iv = setInterval(load, 5000)
    return () => clearInterval(iv)
  }, [id])

  // Auto refresh ongoing matches every 5s
  useEffect(() => {
    const iv = setInterval(() => {
      if (t?.status === 'finished') return
      load()
    }, 5000)
    return () => clearInterval(iv)
  }, [t?.status])

  // Recompute connector paths after layout changes
  useEffect(() => {
    function compute() {
      const container = gridRef.current
      if (!container) return setLinks([])
      const containerRect = container.getBoundingClientRect()
      const newLinks: Array<{ from: { x: number, y: number }, to: { x: number, y: number } }> = []
      for (let r = 0; r < rounds.length - 1; r++) {
        const current = rounds[r]
        current.forEach((_m, j) => {
          const fromKey = `${r}-${j}`
          const toKey = `${r + 1}-${Math.floor(j / 2)}`
          const fromEl = cardRefs.current[fromKey]
          const toEl = cardRefs.current[toKey]
          if (!fromEl || !toEl) return
          const fr = fromEl.getBoundingClientRect()
          const tr = toEl.getBoundingClientRect()
          const from = {
            x: fr.right - containerRect.left + container.scrollLeft,
            y: fr.top + fr.height / 2 - containerRect.top + container.scrollTop,
          }
          const to = {
            x: tr.left - containerRect.left + container.scrollLeft,
            y: tr.top + tr.height / 2 - containerRect.top + container.scrollTop,
          }
          newLinks.push({ from, to })
        })
      }
      setLinks(newLinks)
    }
    const id = window.requestAnimationFrame(compute)
    return () => window.cancelAnimationFrame(id)
  }, [rounds, loading])

  useEffect(() => {
    const onResize = () => setLinks(l => [...l])
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  if (loading) return <div>Yükleniyor...</div>
  if (error) return <div className="text-red-600">{error}</div>
  if (!t) return <div>Turnuva bulunamadı.</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{t.name}</h2>
          <div className="text-sm text-neutral-600">Durum: {t.status} • Tur: {t.currentRound} {t.category ? `• ${t.category}` : ''}</div>
        </div>
        {t.status === 'ongoing' && (
          <a href={`/tournaments/${t._id}/vote`} className="px-3 py-2 rounded bg-neutral-900 text-white hover:bg-neutral-800 text-sm">Turnuvayı Oyla</a>
        )}
      </div>

      <div className="w-full overflow-auto">
        <div ref={gridRef} className="relative grid" style={{ gridTemplateColumns: `repeat(${rounds.length}, minmax(260px, 1fr))`, gap: '24px', padding: '8px' }}>
          <svg className="pointer-events-none absolute inset-0" style={{ width: '100%', height: '100%' }}>
            {links.map((ln, i) => {
              const dx = Math.max(40, (ln.to.x - ln.from.x) / 2)
              const path = `M ${ln.from.x} ${ln.from.y} C ${ln.from.x + dx} ${ln.from.y}, ${ln.to.x - dx} ${ln.to.y}, ${ln.to.x} ${ln.to.y}`
              return (
                <path key={i} d={path} stroke="#0f172a" strokeWidth={2} fill="none" />
              )
            })}
          </svg>
          {rounds.map((col, idx) => (
            <div key={idx} className="space-y-3">
              <div className="text-sm font-medium">Tur {idx + 1}</div>
              {col.map((m, j) => (
                <div ref={el => { cardRefs.current[`${idx}-${j}`] = el }} key={m._id} className={`rounded-lg border bg-white p-3 shadow-sm ${m.status==='finished' ? 'ring-1 ring-emerald-500' : ''}`}>
                  <div className="flex items-center justify-between text-xs text-neutral-500 mb-2">
                    <span>{m.isBye ? 'Bye' : (m.status === 'finished' ? 'Bitti' : 'Devam ediyor')}</span>
                    <span>Tur {m.round}</span>
                  </div>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <div className="min-w-0">
                      {m.aImage && (
                        <img src={`${(m.aImage as string).startsWith('http') ? m.aImage : (import.meta.env.VITE_API_URL || 'http://localhost:5000') + m.aImage}`} alt="" className="w-full h-20 object-cover rounded" />
                      )}
                      <div className="text-sm font-medium truncate mt-1">{m.aTitle} {m.status==='finished' && m.percentA >= m.percentB ? <span className="ml-1 inline-flex items-center gap-1 text-emerald-700">✓</span> : null}</div>
                      <div className="h-2 w-full bg-neutral-200 rounded overflow-hidden mt-1"><div className="h-2 bg-blue-600 transition-all duration-700" style={{ width: `${m.percentA}%` }} /></div>
                      <div className="text-[11px] text-neutral-600">%{m.percentA}</div>
                    </div>
                    <div className="flex flex-col items-center justify-center">
                      <div className="relative w-14 h-14 rounded-full" style={{ background: `conic-gradient(#2563eb ${m.percentA}%, #10b981 0)` }}>
                        <div className="absolute inset-1 rounded-full bg-white flex items-center justify-center text-[10px] font-semibold">%{m.percentA}</div>
                      </div>
                      <div className="mt-1 text-[10px] text-neutral-600">Anlık</div>
                    </div>
                    <div className="min-w-0 text-right">
                      {m.bImage && (
                        <img src={`${(m.bImage as string).startsWith('http') ? m.bImage : (import.meta.env.VITE_API_URL || 'http://localhost:5000') + m.bImage}`} alt="" className="w-full h-20 object-cover rounded" />
                      )}
                      <div className="text-sm font-medium truncate mt-1">{m.bTitle} {m.status==='finished' && m.percentB > m.percentA ? <span className="ml-1 inline-flex items-center gap-1 text-emerald-700">✓</span> : null}</div>
                      <div className="h-2 w-full bg-neutral-200 rounded overflow-hidden mt-1"><div className="h-2 bg-emerald-600 transition-all duration-700" style={{ width: `${m.percentB}%` }} /></div>
                      <div className="text-[11px] text-neutral-600">%{m.percentB}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


