import { useEffect, useState } from 'react'
import { api } from '../api/client'
import TournamentBracket from './components/TournamentBracket'
import { Link } from 'react-router-dom'

export default function ActiveTournaments() {
  const [tournaments, setTournaments] = useState<any[]>([])
  const [voteSummaries, setVoteSummaries] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let isMounted = true
    async function load() {
      try {
        const ts = await api.get('/tournaments')
        if (!isMounted) return
        const list = (ts.data || []).filter((t: any) => t.status === 'ongoing')
        setTournaments(list)
        try {
          const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
          if (token) {
            const mv = await api.get('/votes/me')
            if (!isMounted) return
            setVoteSummaries(mv.data?.summaries || {})
          } else {
            setVoteSummaries({})
          }
        } catch { if (isMounted) setVoteSummaries({}) }
      } catch {}
    }
    load()
    const iv = setInterval(load, 10000)
    return () => { isMounted = false; clearInterval(iv) }
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-neutral-900">Aktif Turnuvalar ve Eşleşmeler</h2>
        <p className="text-sm text-neutral-600">Eşleşmeler turnuvalara göre gruplanmıştır</p>
      </div>
      {tournaments.length === 0 ? (
        <div className="text-sm text-neutral-600">Şu an aktif turnuva yok.</div>
      ) : (
        <div className="space-y-6">
          {tournaments.map(t => (
            <div key={t._id} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <Link to={`/tournaments/${t._id}`} className="font-medium hover:underline">{t.name}</Link>
                    <div className="text-xs text-neutral-600">Durum: Devam ediyor • Tur: {t.currentRound} {t.category ? `• ${t.category}` : ''}</div>
                    {t.metrics?.mode === 'time' && (
                      <div className="text-[11px] text-neutral-500">Kalan: {t.metrics.remainingSeconds}s / {t.metrics.totalSeconds}s • Eşleşmeler: {t.metrics.currentActive}/{t.metrics.currentTotal}</div>
                    )}
                    {t.metrics?.mode === 'participation' && (
                      <div className="text-[11px] text-neutral-500">Katılım: {t.metrics.voters} / {t.metrics.required} • Eşleşmeler: {t.metrics.currentActive}/{t.metrics.currentTotal}</div>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-3">
                {voteSummaries && voteSummaries[t._id] ? (
                  <span className="inline-flex items-center px-3 py-2 rounded bg-neutral-200 text-neutral-600 text-sm cursor-not-allowed">Bu turda oy kullandınız</span>
                ) : (
                  <Link to={`/tournaments/${t._id}/vote`} className="inline-flex items-center px-3 py-2 rounded bg-neutral-900 text-white hover:bg-neutral-800 text-sm">Turnuvayı Oyla</Link>
                )}
              </div>
              <div className="mt-4">
                <TournamentBracket tournamentId={t._id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


