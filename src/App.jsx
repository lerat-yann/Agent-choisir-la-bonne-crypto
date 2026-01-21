import { useEffect, useMemo, useState } from 'react'
import { getCoinMarketData, searchCoins } from './lib/api/coingecko'
import { createRateLimiter } from './lib/rateLimit'
import './App.css'

function App() {
  const [query, setQuery] = useState('')
  const [searchStatus, setSearchStatus] = useState('idle')
  const [searchResults, setSearchResults] = useState([])
  const [searchFromCache, setSearchFromCache] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const [detailStatus, setDetailStatus] = useState('idle')
  const [detailData, setDetailData] = useState(null)
  const [detailFromCache, setDetailFromCache] = useState(false)

  const searchLimiter = useMemo(
    () => createRateLimiter({ intervalMs: 1000, maxCalls: 1 }),
    []
  )
  const detailLimiter = useMemo(
    () => createRateLimiter({ intervalMs: 1000, maxCalls: 1 }),
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
        } else {
          setSearchStatus('error')
        }
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [query, searchLimiter])

  async function handleSelect(coinId) {
    if (!coinId) return
    if (!detailLimiter()) {
      setDetailStatus('rate_limited')
      return
    }
    setSelectedId(coinId)
    setDetailStatus('loading')
    try {
      const { data, fromCache } = await getCoinMarketData(coinId)
      setDetailData(data)
      setDetailFromCache(fromCache)
      setDetailStatus('idle')
    } catch (error) {
      if (error?.message === 'rate_limited') {
        setDetailStatus('rate_limited')
      } else {
        setDetailStatus('error')
      }
    }
  }

  return (
    <div className="page">
      <header className="header">
        <div className="brand">
          <span className="brand-mark">◉</span>
          <div>
            <h1>Choisir la bonne crypto</h1>
            <p className="subtitle">Analyse long terme, claire et neutre.</p>
          </div>
        </div>
        <button className="cta">Lancer un rapport</button>
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
              {searchFromCache && searchResults.length > 0 && 'Donnees en cache'}
            </div>
          </div>
          {searchResults.length > 0 && (
            <ul className="search-results">
              {searchResults.map((coin) => (
                <li key={coin.id}>
                  <button
                    className="search-result"
                    onClick={() => handleSelect(coin.id)}
                  >
                    <span>{coin.name}</span>
                    <span className="muted">{coin.symbol?.toUpperCase()}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {selectedId && (
            <div className="detail-status">
              {detailStatus === 'loading' && 'Chargement des donnees...'}
              {detailStatus === 'rate_limited' && 'Limite atteinte, pause'}
              {detailStatus === 'error' && 'Erreur de recuperation'}
              {detailFromCache && detailData && 'Donnees en cache'}
            </div>
          )}
          {detailData && (
            <div className="detail-card">
              <h3>{detailData.name}</h3>
              <div className="detail-grid">
                <div>
                  <span className="muted">Prix USD</span>
                  <div>${detailData.market_data?.current_price?.usd}</div>
                </div>
                <div>
                  <span className="muted">Market cap</span>
                  <div>${detailData.market_data?.market_cap?.usd}</div>
                </div>
                <div>
                  <span className="muted">Volume 24h</span>
                  <div>${detailData.market_data?.total_volume?.usd}</div>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="grid">
          <div className="panel">
            <h3>Donnees marche (CoinGecko)</h3>
            <p>Prix, capitalisation, volume, historique.</p>
          </div>
          <div className="panel">
            <h3>Fondamentaux & risques</h3>
            <p>Explication neutre, pas de conseil financier.</p>
          </div>
          <div className="panel">
            <h3>Graphiques long terme</h3>
            <p>Tendance, drawdown, volatilite relative.</p>
          </div>
          <div className="panel">
            <h3>Comparaison multi-crypto</h3>
            <p>Tableau clair des differences principales.</p>
          </div>
        </section>

        <section className="panel">
          <h2>Mode debutant</h2>
          <p>Definitions simples, 3 erreurs frequentes, checklist securite.</p>
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
