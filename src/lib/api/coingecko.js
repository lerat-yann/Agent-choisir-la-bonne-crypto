import { fetchJson } from './fetchJson'
import { getCached, setCached } from '../cache'

const BASE_URL = 'https://api.coingecko.com/api/v3'
const DEFAULT_TTL_MS = 15 * 60 * 1000

function cacheKey(path, params) {
  return `cg:${path}:${JSON.stringify(params || {})}`
}

async function fetchWithCache(path, params, ttlMs = DEFAULT_TTL_MS, options = {}) {
  const key = cacheKey(path, params)
  const cached = getCached(key)
  if (cached) {
    if (options.returnMeta) {
      return { data: cached, fromCache: true }
    }
    return cached
  }

  const url = new URL(`${BASE_URL}${path}`)
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  const data = await fetchJson(url.toString())
  setCached(key, data, ttlMs)
  if (options.returnMeta) {
    return { data, fromCache: false }
  }
  return data
}

export function getCoinMarketData(id) {
  return fetchWithCache(
    `/coins/${id}`,
    {
      localization: 'false',
      tickers: 'false',
      community_data: 'false',
      developer_data: 'false',
      sparkline: 'false'
    },
    DEFAULT_TTL_MS,
    { returnMeta: true }
  )
}

export function getMarketChart(id, days = 365) {
  return fetchWithCache(`/coins/${id}/market_chart`, {
    vs_currency: 'usd',
    days: String(days)
  })
}

export function searchCoins(query) {
  return fetchWithCache(
    '/search',
    { query },
    5 * 60 * 1000,
    { returnMeta: true }
  )
}
