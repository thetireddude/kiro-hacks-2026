const TAVILY_API_URL = 'https://api.tavily.com/search'

export interface TavilySearchResult {
  title: string
  url: string
  content: string
  score: number
  raw_content: string | null
  favicon?: string
  images?: Array<{ url: string; description: string }>
}

interface TavilySearchResponse {
  query: string
  results: TavilySearchResult[]
  response_time: string
  images: unknown[]
}

/**
 * Search Tavily for current news sources matching the given query.
 * Reads `TAVILY_API_KEY` from the environment.
 * Returns the raw result array from Tavily.
 * Throws on missing API key or HTTP errors.
 */
export async function searchTavily(query: string): Promise<TavilySearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) {
    throw new Error('TAVILY_API_KEY environment variable is not set')
  }

  const response = await fetch(TAVILY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      topic: 'news',
      search_depth: 'basic',
      max_results: 10,
      include_raw_content: false,
      include_images: false,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new Error(
      `Tavily API error: ${response.status} ${response.statusText} — ${errorText}`
    )
  }

  const data: TavilySearchResponse = await response.json()
  return data.results
}
