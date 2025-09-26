import { useEffect, useMemo, useRef, useState } from 'react'
import { useSwipeable } from 'react-swipeable'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'

export default function TournamentVote() {
  const { id } = useParams()
  const navigate = useNavigate()
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const [t, setT] = useState<any | null>(null)
  const [queue, setQueue] = useState<string[]>([])
  const [current, setCurrent] = useState<any | null>(null)
  const [percent, setPercent] = useState<{A:number;B:number}>({A:0,B:0})
  const [stepDone, setStepDone] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [votedSet, setVotedSet] = useState<Set<string>>(new Set())
  const [votesLoaded, setVotesLoaded] = useState(false)
  const [initialCount, setInitialCount] = useState(0)
  const [processedCount, setProcessedCount] = useState(0)
  const [expectedCount, setExpectedCount] = useState(0)
  const [roundVoted, setRoundVoted] = useState(false)
  const [initialIds, setInitialIds] = useState<Set<string>>(new Set())
  const [localVoted, setLocalVoted] = useState<Set<string>>(new Set())
  const processedIdsRef = useRef<Set<string>>(new Set())
  const lastVotedIdRef = useRef<string | null>(null)
  const [showCongrats, setShowCongrats] = useState(false)
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [swipeDir, setSwipeDir] = useState<'left'|'right'|null>(null)
  const hasInitializedRef = useRef(false)
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const advanceForIdRef = useRef<string | null>(null)

  function log(...args: any[]) {
    try { console.log('[TVOTE]', ...args) } catch {}
  }

  function advanceCurrent(afterMs: number) {
    if (!current) return
    setStepDone(true)
    const currentId = String(current.id)
    // prevent duplicate schedules for same current
    if (advanceForIdRef.current === currentId && advanceTimerRef.current) {
      log('advanceCurrent -> skipped duplicate schedule', { currentId })
      return
    }
    if (advanceTimerRef.current) { try { clearTimeout(advanceTimerRef.current) } catch {} }
    log('advanceCurrent -> schedule', { currentId, afterMs, processedCount, expectedCount })
    const tm = setTimeout(() => {
      setStepDone(false)
      setQueue(q => q.slice(1))
      if (!processedIdsRef.current.has(currentId)) {
        processedIdsRef.current.add(currentId)
        setProcessedCount(c => c + 1)
      }
      if (lastVotedIdRef.current === currentId) lastVotedIdRef.current = null
      log('advanceCurrent -> done', { currentId, processedCount: processedIdsRef.current.size })
      refreshRoundDone(t?._id)
      if (advanceTimerRef.current) { try { clearTimeout(advanceTimerRef.current) } catch {} }
      advanceTimerRef.current = null
      advanceForIdRef.current = null
    }, afterMs)
    advanceTimerRef.current = tm
    advanceForIdRef.current = currentId
    return () => { try { clearTimeout(tm) } catch {} }
  }

  async function refreshRoundDone(tournamentId?: string) {
    try {
      const mv = await api.get('/votes/me')
      const summaries = mv.data?.summaries || {}
      const tid = tournamentId || (t?._id)
      setRoundVoted(Boolean(tid && summaries[String(tid)]))
    } catch { setRoundVoted(false) }
  }

  useEffect(() => {
    if (!token) { navigate('/login'); return }
  }, [token, navigate])

  useEffect(() => {
    (async () => {
      try {
        setLoading(true)
        const { data } = await api.get(`/tournaments/${id}`)
        setT(data.tournament)
        const roundIdx = (data.tournament.currentRound || 1) - 1
        const mids: string[] = data.tournament.rounds?.[roundIdx] || []
        log('load tournament', { t: data.tournament._id, round: data.tournament.currentRound, mids })
        // Önce votable (ongoing ve self-match olmayan) eşleşmeleri belirle
        let details = await Promise.all(
          mids.map(async (mid) => {
            try {
              const r = await api.get(`/matches/${mid}`, { params: { _: Date.now() } })
              if (!r?.data?.match) return null
              return { id: mid, match: r.data.match }
            } catch {
              return null
            }
          })
        )
        // Eksik gelenler için ikinci deneme
        const missing = mids.filter((mid, idx) => !details[idx])
        if (missing.length) {
          log('retry missing match details', { missing })
          const retry = await Promise.all(
            missing.map(async (mid) => {
              try {
                const r = await api.get(`/matches/${mid}`, { params: { _: Date.now() } })
                if (!r?.data?.match) return null
                return { id: mid, match: r.data.match }
              } catch { return null }
            })
          )
          // details dizisini orijinal sırasına yerleştir
          let j = 0
          details = details.map((entry, i) => entry || retry[j++])
        }
        // Sıra deterministik olsun: backenden gelen listedeki sıra
        const votable = (details.filter(Boolean) as any[])
          .filter((d: any) => d.match?.status === 'ongoing' && String(d.match.postAId) !== String(d.match.postBId))
          .map((d: any) => String(d.id))
        setQueue(votable)
        setInitialCount(votable.length)
        // Yalnızca bu oturumda oylanması beklenen maç adedi
        setExpectedCount(votable.length)
        setInitialIds(new Set(votable.map((x:string)=>String(x))))
        setProcessedCount(0)
        processedIdsRef.current = new Set()
        setRoundVoted(false)
        log('built votable queue', { votable, expected: votable.length })
        try {
          const mv = await api.get('/votes/me')
          const raw = mv.data?.votes || mv.data || []
          const s = new Set<string>((raw || []).map((v: any) => String(v.matchId)))
          setVotedSet(s)
          // Eğer bu turnuvanın mevcut turundaki tüm eşleşmelere oy verilmişse yönlendirme yapma ve uyarı göster
          const summaries = mv.data?.summaries || {}
          if (summaries && summaries[String(data.tournament._id)]) {
            setError('Bu turnuvayı zaten oyladınız. Her eşleşmeye yalnızca 1 kez oy verebilirsiniz.')
            log('already completed summary true, aborting flow')
            return
          }
        } catch {}
        finally { setVotesLoaded(true) }
      } catch (e: any) {
        setError(e?.response?.data?.error || 'Yüklenemedi')
        log('load error', e?.response?.data || e?.message)
      } finally { setLoading(false); if (!votesLoaded) setVotesLoaded(true) }
    })()
  }, [id])

  useEffect(() => {
    (async () => {
      if (!queue.length) { setCurrent(null); return }
      const mid = String(queue[0])
      try {
        const r = await api.get(`/matches/${mid}`, { params: { _: Date.now() } })
        if (!r?.data?.match) {
          // veri yoksa kısa bir gecikme ile tekrar dene
          setCurrent(null)
          setTimeout(() => { setCurrent({ id: mid, a: undefined, b: undefined, status: undefined }) }, 500)
          log('match details empty, schedule retry', { mid })
          return
        }
        // Geçiş zamanlayıcılarını temizle (yeni maça başlıyoruz)
        if (advanceTimerRef.current) { try { clearTimeout(advanceTimerRef.current) } catch {} }
        advanceTimerRef.current = null
        advanceForIdRef.current = null
        setCurrent({ id: mid, a: r.data.a, b: r.data.b, status: r.data.match?.status })
        setPercent({A:r.data.stats.percentA, B:r.data.stats.percentB})
        log('current set', { mid, status: r.data.match?.status })
      } catch { setCurrent(null) }
    })()
  }, [queue])

  useEffect(() => {
    if (!current) return
    const es = new EventSource(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/matches/${current.id}/stream`)
    es.onmessage = (e) => {
      try { const p = JSON.parse(e.data); setPercent({A:p.percentA, B:p.percentB}); log('sse', { id: current.id, p }) } catch {}
    }
    return () => es.close()
  }, [current?.id])

  useEffect(() => {
    if (!current) return
    if (current.status && current.status !== 'ongoing') {
      // Bitmiş maçları atla (idempotent)
      log('skip finished match', { id: current.id, status: current.status })
      return advanceCurrent(2000)
    }
    if (votedSet.has(String(current.id))) {
      // Zaten oy verilmişse 5 sn bekleyip otomatik geç
      log('already voted for match, auto advance later', { id: current.id })
      return advanceCurrent(5000)
    }
  }, [current?.id, votedSet])

  async function vote(choice: 'A' | 'B') {
    if (!current) return
    try {
      lastVotedIdRef.current = String(current.id)
      log('vote submit', { id: current.id, choice })
      await api.post('/votes', { matchId: current.id, choice })
      setVotedSet(prev => new Set(prev).add(String(current.id)))
      setLocalVoted(prev => new Set(prev).add(String(current.id)))
    } catch (err: any) {
      const code = err?.response?.status
      if (code === 409) {
        lastVotedIdRef.current = String(current.id)
        setVotedSet(prev => new Set(prev).add(String(current.id)))
        setLocalVoted(prev => new Set(prev).add(String(current.id)))
        log('vote duplicate (409) treated as success', { id: current.id })
      } else {
        // diğer hatalarda da akışı kilitlemeyelim, göster ve geç
        log('vote error', err?.response?.data || err?.message)
      }
    }
    // 5 sn sonucu göster, sonra bir sonraki maça geç (idempotent)
    advanceCurrent(5000)
  }

  // Mobil swipe: sola kaydır B, sağa kaydır A seçimi
  const swipeHandlers = useSwipeable({
    onSwiping: (e) => {
      if (!current || stepDone || votedSet.has(String(current?.id))) return
      if (e.deltaX > 20) setSwipeDir('right')
      else if (e.deltaX < -20) setSwipeDir('left')
      else setSwipeDir(null)
    },
    onSwipedLeft: () => { setSwipeDir(null); if (!stepDone && current && !votedSet.has(String(current.id))) vote('B') },
    onSwipedRight: () => { setSwipeDir(null); if (!stepDone && current && !votedSet.has(String(current.id))) vote('A') },
    onTouchEndOrOnMouseUp: () => setSwipeDir(null),
    trackMouse: true,
    delta: 30,
  })

  const allDone = useMemo(() => {
    if (initialIds.size === 0) return queue.length === 0 && !current
    // initialIds içindeki tüm id'ler için oy verildi mi? (bitmiş olanlar da dahil)
    for (const idv of Array.from(initialIds)) {
      if (!votedSet.has(String(idv))) return false
    }
    return true
  }, [initialIds, votedSet])
  const [redirected, setRedirected] = useState(false)

  const alreadyCompletedTournament = useMemo(() => {
    // Tüm maç id'leri + mevcut için votedSet'i kapsıyor mu?
    const allIds = new Set<string>([...queue, ...(current ? [String(current.id)] : [])])
    if (allIds.size === 0) return false
    for (const idv of Array.from(allIds)) {
      if (!votedSet.has(String(idv))) return false
    }
    return true
  }, [queue, current, votedSet])

  // When all matches in the round are voted, progress round then go home automatically
  useEffect(() => {
    if (!allDone || redirected || !t?._id) return
    const target = expectedCount > 0 ? expectedCount : initialCount
    // Hem sayaç hem de backend özeti ile doğrula
    if (target > 0 && processedCount < target) return
    if (!roundVoted) return
    log('redirecting home', { allDone, processedCount, target, roundVoted })
    setShowCongrats(true)
    setRedirected(true)
    ;(async () => { try { await api.post(`/tournaments/${t._id}/progress-public`) } catch {} })()
    // Navigation will be handled by separate effect bound to showCongrats
  }, [allDone, redirected, t?._id, processedCount, initialCount, expectedCount, roundVoted])

  useEffect(() => {
    if (!showCongrats) return
    if (redirectTimerRef.current) { try { clearTimeout(redirectTimerRef.current) } catch {} }
    redirectTimerRef.current = setTimeout(() => {
      try { navigate('/') } catch { window.location.href = '/' }
    }, 1500)
    return () => { if (redirectTimerRef.current) { try { clearTimeout(redirectTimerRef.current) } catch {} } }
  }, [showCongrats])

  if (loading) return <div>Yükleniyor...</div>
  if (error) return <div className="text-red-600">{error}</div>
  if (!t) return <div>Turnuva bulunamadı.</div>

  return (
    <div className="space-y-6 max-w-md mx-auto sm:max-w-3xl">
      {showCongrats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">✓</div>
            <div className="text-lg font-semibold text-neutral-900">Tebrikler!</div>
            <div className="mt-1 text-sm text-neutral-600">Bu turdaki tüm eşleşmeleri oyladınız. Yönlendiriliyorsunuz…</div>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">{t.name} • Tur {t.currentRound}</h2>
          <div className="text-sm text-neutral-600">Bu turdaki tüm eşleşmeleri oylayın</div>
        </div>
        {!allDone ? (
          <div className="text-sm text-neutral-600">Kalan eşleşme: {Math.max(0, expectedCount - processedCount)}</div>
        ) : (
          <div className="text-sm text-neutral-700">Oylama tamamlandı, ana sayfaya yönlendiriliyorsunuz...</div>
        )}
      </div>

      {alreadyCompletedTournament && (
        <div className="rounded border bg-emerald-50 text-emerald-800 px-3 py-2 text-sm">Bu turnuvadaki tüm eşleşmelere oy vermişsiniz.</div>
      )}

      {!current ? (
        <div className="text-sm text-neutral-600">Bu turdaki eşleşmelerin tümünü oyladınız.</div>
      ) : (
        <div {...swipeHandlers} className="relative rounded-2xl border border-neutral-200 bg-white p-4 sm:p-8 shadow-sm">
          {/* Mobil swipe rehberi/overlay */}
          <div className="sm:hidden absolute inset-0 pointer-events-none select-none">
            {swipeDir === 'left' && (
              <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-blue-50/80 to-transparent flex items-center justify-center">
                <div className="rounded-full bg-blue-600 text-white px-3 py-1 text-xs">Sola kaydır • B</div>
              </div>
            )}
            {swipeDir === 'right' && (
              <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-emerald-50/80 to-transparent flex items-center justify-center">
                <div className="rounded-full bg-emerald-600 text-white px-3 py-1 text-xs">Sağa kaydır • A</div>
              </div>
            )}
          </div>
          {/* VS rozeti */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="hidden md:flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 text-white font-semibold shadow-lg">VS</div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:gap-8">
            {[{key:'A', post: current.a, color:'blue'}, {key:'B', post: current.b, color:'emerald'}].map((side) => (
              <div key={side.key} className="space-y-4">
                {side.post?.imageUrl && (
                  <img src={`${(side.post.imageUrl as string).startsWith('http') ? side.post.imageUrl : (import.meta.env.VITE_API_URL || 'http://localhost:5000') + side.post.imageUrl}`} alt="" className="w-full h-40 sm:h-56 object-cover rounded" />
                )}
                <h3 className="font-semibold text-neutral-800 line-clamp-2">{side.post?.title || 'Silinmiş yazı'}</h3>
                <button disabled={!votesLoaded || stepDone || votedSet.has(String(current.id)) || current.status==='finished'} onClick={() => vote(side.key as 'A'|'B')} className={`w-full inline-flex items-center justify-center rounded-lg bg-${side.color}-600 px-5 py-3 text-white hover:bg-${side.color}-700 transition disabled:opacity-60`}>
                  Oy ver
                </button>
              </div>
            ))}
          </div>
          <div className="mt-6 md:mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="mb-1 flex justify-between text-sm text-neutral-600"><span>{current.a?.title || 'Silinmiş yazı'}</span><span>%{percent.A}</span></div>
              <div className="h-3 w-full rounded-full bg-neutral-200 overflow-hidden">
                <div className="h-3 bg-blue-600 transition-all duration-700" style={{width: `${percent.A}%`}} />
              </div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-sm text-neutral-600"><span>{current.b?.title || 'Silinmiş yazı'}</span><span>%{percent.B}</span></div>
              <div className="h-3 w-full rounded-full bg-neutral-200 overflow-hidden">
                <div className="h-3 bg-emerald-600 transition-all duration-700" style={{width: `${percent.B}%`}} />
              </div>
            </div>
          </div>
          {(stepDone || votedSet.has(String(current.id))) && (
            <div className="mt-4 text-sm text-neutral-700">Sonuç gösteriliyor, diğer eşleşmeye geçiliyor...</div>
          )}
          {/* Mobil alt eylem çubuğu */}
          <div className="sm:hidden mt-4 grid grid-cols-2 gap-3">
            <button disabled={!votesLoaded || stepDone || votedSet.has(String(current.id)) || current.status==='finished'} onClick={() => vote('A')} className="rounded-lg bg-emerald-600 px-4 py-3 text-white disabled:opacity-60">Sağa kaydır/A</button>
            <button disabled={!votesLoaded || stepDone || votedSet.has(String(current.id)) || current.status==='finished'} onClick={() => vote('B')} className="rounded-lg bg-blue-600 px-4 py-3 text-white disabled:opacity-60">Sola kaydır/B</button>
          </div>
        </div>
      )}
    </div>
  )
}


