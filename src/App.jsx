import { useEffect, useMemo, useRef, useState } from 'react'
import { getCoinMarketData, searchCoins } from './lib/api/coingecko'
import { createRateLimiter } from './lib/rateLimit'
import PriceChart from './components/PriceChart'
import './App.css'

const MAX_SELECTED = 3

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function formatUsd(value) {
  if (value === null || value === undefined) return '-'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value)
}

function App() {
  const [query, setQuery] = useState('')
  const [searchStatus, setSearchStatus] = useState('idle')
  const [searchResults, setSearchResults] = useState([])
  const [searchFromCache, setSearchFromCache] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [detailStatus, setDetailStatus] = useState('idle')
  const [detailData, setDetailData] = useState({})
  const [detailFromCache, setDetailFromCache] = useState({})
  const [detailStatusById, setDetailStatusById] = useState({})
  const [chartStatus, setChartStatus] = useState('idle')
  const [chartData, setChartData] = useState({})
  const [chartStatusById, setChartStatusById] = useState({})
  const [reportStatus, setReportStatus] = useState('idle')
  const reportRef = useRef(null)

  const searchLimiter = useMemo(
    () => createRateLimiter({ intervalMs: 1000, maxCalls: 2 }),
    []
  )
  const detailLimiter = useMemo(
    () => createRateLimiter({ intervalMs: 1000, maxCalls: 1 }),
    []
  )
  const chartLimiter = useMemo(
    () => createRateLimiter({ intervalMs: 1500, maxCalls: 1 }),
    []
  )

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setSearchResults([])
      setSearchStatus('idle')
      return
    }

    setSearchStatus('loading')
    const timeoutId = setTimeout(async () => {
      if (!searchLimiter()) {
        setSearchStatus('rate_limited')
        setTimeout(() => setSearchStatus('idle'), 1000)
        return
      }
      try {
        const { data, fromCache } = await searchCoins(trimmed)
        const coins = data?.coins || []
        setSearchResults(coins.slice(0, 10))
        setSearchFromCache(fromCache)
        setSearchStatus('idle')
      } catch (error) {
        if (error?.message === 'rate_limited') {
          setSearchStatus('rate_limited')
          setTimeout(() => setSearchStatus('idle'), 1000)
        } else {
          setSearchStatus('error')
        }
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [query, searchLimiter])

  async function fetchCoinDetails(coinId) {
    if (!detailLimiter()) {
      setDetailStatus('rate_limited')
      setDetailStatusById((prev) => ({ ...prev, [coinId]: 'rate_limited' }))
      setTimeout(() => setDetailStatus('idle'), 1000)
      return
    }
    setDetailStatus('loading')
    setDetailStatusById((prev) => ({ ...prev, [coinId]: 'loading' }))
    try {
      const { data, fromCache } = await getCoinMarketData(coinId)
      setDetailData((prev) => ({ ...prev, [coinId]: data }))
      setDetailFromCache((prev) => ({ ...prev, [coinId]: fromCache }))
      setDetailStatus('idle')
      setDetailStatusById((prev) => ({ ...prev, [coinId]: 'idle' }))
    } catch (error) {
      if (error?.message === 'rate_limited') {
        setDetailStatus('rate_limited')
        setDetailStatusById((prev) => ({ ...prev, [coinId]: 'rate_limited' }))
        setTimeout(() => setDetailStatus('idle'), 1000)
      } else {
        setDetailStatus('error')
        setDetailStatusById((prev) => ({ ...prev, [coinId]: 'error' }))
      }
    }
  }

  async function fetchMarketChart(coinId) {
    if (!chartLimiter()) {
      setChartStatus('rate_limited')
      setChartStatusById((prev) => ({ ...prev, [coinId]: 'rate_limited' }))
      setTimeout(() => setChartStatus('idle'), 1000)
      return
    }
    setChartStatus('loading')
    setChartStatusById((prev) => ({ ...prev, [coinId]: 'loading' }))
    try {
      const { getMarketChart } = await import('./lib/api/coingecko')
      const data = await getMarketChart(coinId, 365)
      setChartData((prev) => ({ ...prev, [coinId]: data }))
      setChartStatus('idle')
      setChartStatusById((prev) => ({ ...prev, [coinId]: 'idle' }))
    } catch (error) {
      if (error?.message === 'rate_limited') {
        setChartStatus('rate_limited')
        setChartStatusById((prev) => ({ ...prev, [coinId]: 'rate_limited' }))
        setTimeout(() => setChartStatus('idle'), 1000)
      } else {
        setChartStatus('error')
        setChartStatusById((prev) => ({ ...prev, [coinId]: 'error' }))
      }
    }
  }

  async function handleSelect(coinId) {
    if (!coinId) return
    if (selectedIds.includes(coinId)) return
    if (selectedIds.length >= MAX_SELECTED) return
    setSelectedIds((prev) => [...prev, coinId])
    await fetchCoinDetails(coinId)
    await fetchMarketChart(coinId)
  }

  function handleRemove(coinId) {
    setSelectedIds((prev) => prev.filter((id) => id !== coinId))
  }

  async function handleReport() {
    if (selectedIds.length === 0) return
    setReportStatus('loading')
    setDetailStatus('loading')
    setChartStatus('loading')
    for (const coinId of selectedIds) {
      if (!detailData[coinId]) {
        await fetchCoinDetails(coinId)
        await sleep(500)
      }
      if (!chartData[coinId]) {
        await fetchMarketChart(coinId)
        await sleep(800)
      }
    }
    setDetailStatus('idle')
    setChartStatus('idle')
    setReportStatus('done')
    setTimeout(() => setReportStatus('idle'), 2000)
    reportRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="page">
      <header className="header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <div>
            <h1>Choisir la bonne crypto</h1>
            <p className="subtitle">Analyse long terme, claire et neutre.</p>
          </div>
        </div>
        <button
          className="cta"
          onClick={handleReport}
          disabled={selectedIds.length === 0}
        >
          {reportStatus === 'loading' ? 'Preparation...' : 'Lancer un rapport'}
        </button>
      </header>

      <main className="main">
        <section className="panel">
          <h2>Selection des actifs</h2>
          <p>Recherche simple, 1-3 actifs max. Anti-spam et cache actif.</p>
          <div className="search">
            <input
              className="search-input"
              type="text"
              placeholder="Rechercher une crypto (ex: bitcoin)"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <div className="search-status">
              {searchStatus === 'loading' && 'Recherche...'}
              {searchStatus === 'rate_limited' && 'Limite atteinte, pause'}
              {searchStatus === 'error' && 'Erreur de recherche'}
              {searchStatus === 'idle' &&
                searchFromCache &&
                searchResults.length > 0 &&
                'Donnees en cache'}
            </div>
          </div>
          {selectedIds.length > 0 && (
            <div className="selected-list">
              {selectedIds.map((id) => (
                <button
                  key={id}
                  className="selected-pill"
                  onClick={() => handleRemove(id)}
                >
                  {id} ✕
                </button>
              ))}
            </div>
          )}
          {searchResults.length > 0 && (
            <ul className="search-results">
              {searchResults.map((coin) => (
                <li key={coin.id}>
                  <button
                    className="search-result"
                    onClick={() => handleSelect(coin.id)}
                    disabled={
                      selectedIds.includes(coin.id) ||
                      selectedIds.length >= MAX_SELECTED
                    }
                  >
                    <span>{coin.name}</span>
                    <span className="muted">{coin.symbol?.toUpperCase()}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {selectedIds.length > 0 && (
            <div className="detail-status">
              {detailStatus === 'loading' && 'Chargement des donnees...'}
              {detailStatus === 'rate_limited' && 'Limite atteinte, pause'}
              {detailStatus === 'error' && 'Erreur de recuperation'}
              {detailStatus === 'idle' &&
                selectedIds.some((id) => detailFromCache[id]) &&
                'Donnees en cache'}
            </div>
          )}
          {selectedIds.map((id) => {
            const data = detailData[id]
            const status = detailStatusById[id]
            return (
              <div key={id} className="detail-card">
                <h3>{data?.name || id}</h3>
                {data ? (
                  <div className="detail-grid">
                    <div>
                      <span className="muted">Prix USD</span>
                      <div>{formatUsd(data.market_data?.current_price?.usd)}</div>
                    </div>
                    <div>
                      <span className="muted">Market cap</span>
                      <div>{formatUsd(data.market_data?.market_cap?.usd)}</div>
                    </div>
                    <div>
                      <span className="muted">Volume 24h</span>
                      <div>{formatUsd(data.market_data?.total_volume?.usd)}</div>
                    </div>
                  </div>
                ) : (
                  <p className="muted">
                    {status === 'error' && 'Erreur de recuperation'}
                    {status === 'rate_limited' && 'Limite atteinte, pause'}
                    {!status && 'Chargement des donnees...'}
                  </p>
                )}
              </div>
            )
          })}
        </section>

        <section className="grid" ref={reportRef}>
          <div className="panel">
            <h3>Donnees marche (CoinGecko)</h3>
            {selectedIds.length === 0 && (
              <p>Prix, capitalisation, volume, historique.</p>
            )}
            {selectedIds.length > 0 && (
              <div className="panel-stack market-grid">
                <div className="market-row header">
                  <span>Actif</span>
                  <span>Prix</span>
                  <span>Cap</span>
                  <span>Vol 24h</span>
                </div>
                {selectedIds.map((id) => {
                  const data = detailData[id]
                  return (
                    <div key={id} className="market-row">
                      <strong>{data?.name || id}</strong>
                      <span>{formatUsd(data?.market_data?.current_price?.usd)}</span>
                      <span>{formatUsd(data?.market_data?.market_cap?.usd)}</span>
                      <span>{formatUsd(data?.market_data?.total_volume?.usd)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <div className="panel">
            <h3>Fondamentaux & risques</h3>
            <ul className="bullet-list">
              <li>Utilite reelle et adoption</li>
              <li>Securite du reseau et decentralisation</li>
              <li>Risques: volatilite, technique, reglementation</li>
            </ul>
          </div>
          <div className="panel">
            <h3>Graphiques long terme</h3>
            {chartStatus === 'loading' && <p>Chargement des tendances...</p>}
            {chartStatus === 'rate_limited' && <p>Limite atteinte, pause</p>}
            {chartStatus === 'error' && <p>Erreur de recuperation</p>}
            {selectedIds.length === 0 && (
              <p>Tendance, drawdown, volatilite relative.</p>
            )}
            {selectedIds.length > 0 && (
              <div className="panel-stack chart-grid">
                {selectedIds.map((id) => {
                  const data = chartData[id]
                  const prices = data?.prices || []
                  const status = chartStatusById[id]
                  return (
                    <div key={id} className="chart-card">
                      <div className="chart-header">
                        <strong>{detailData[id]?.name || id}</strong>
                        <span className="muted">Evolution 365j</span>
                      </div>
                      <div className="chart-wrapper">
                        {prices.length >= 2 ? (
                          <PriceChart
                            prices={prices}
                            label={detailData[id]?.symbol || id}
                          />
                        ) : (
                          <p className="muted">
                            {status === 'error' && 'Erreur de recuperation'}
                            {status === 'rate_limited' && 'Limite atteinte, pause'}
                            {!status && 'Chargement des tendances...'}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <div className="panel">
            <h3>Comparaison multi-crypto</h3>
            {selectedIds.length < 2 && (
              <p>Selectionne 2-3 actifs pour comparer.</p>
            )}
            {selectedIds.length >= 2 && (
              <div className="compare-table">
                <div className="compare-row header">
                  <span>Actif</span>
                  <span>Prix</span>
                  <span>Cap</span>
                  <span>Vol 24h</span>
                </div>
                {selectedIds.map((id) => {
                  const data = detailData[id]
                  return (
                    <div key={id} className="compare-row">
                      <span>{data?.name || id}</span>
                      <span>
                        {formatUsd(data?.market_data?.current_price?.usd)}
                      </span>
                      <span>{formatUsd(data?.market_data?.market_cap?.usd)}</span>
                      <span>
                        {formatUsd(data?.market_data?.total_volume?.usd)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        <section className="panel">
          <h2>Mode debutant</h2>
          <div className="beginner-grid">
            <div>
              <h4>Definitions simples</h4>
              <ul className="bullet-list">
                <li>Capitalisation: valeur totale du reseau</li>
                <li>Volatilite: variation rapide des prix</li>
                <li>Liquidite: facilite d'achat/vente</li>
              </ul>
            </div>
            <div>
              <h4>3 erreurs frequentes</h4>
              <ul className="bullet-list">
                <li>Suivre les promesses irreelles</li>
                <li>Ignorer les risques techniques</li>
                <li>Ne pas diversifier ses sources</li>
              </ul>
            </div>
            <div>
              <h4>Checklist securite</h4>
              <ul className="bullet-list">
                <li>Verifier les sources</li>
                <li>Comprendre le projet avant d'agir</li>
                <li>Rester prudent sur le long terme</li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>
          Avertissement: aucune recommandation d'achat/vente. Donnees
          publiques uniquement.
        </p>
      </footer>
    </div>
  )
}

export default App
