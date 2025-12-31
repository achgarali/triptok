/**
 * Service for extracting metadata from social media URLs (TikTok, Instagram)
 */

export interface MetadataResult {
  platform: 'tiktok' | 'instagram' | 'other'
  url: string
  title?: string
  description?: string
  thumbnailUrl?: string
  author?: string
  isValid: boolean
  error?: string
}

/**
 * Detects platform from URL
 */
export function detectPlatform(url: string): 'tiktok' | 'instagram' | 'other' {
  const normalizedUrl = url.toLowerCase().trim()
  
  if (normalizedUrl.includes('tiktok.com') || normalizedUrl.includes('vm.tiktok.com')) {
    return 'tiktok'
  }
  
  if (normalizedUrl.includes('instagram.com') || normalizedUrl.includes('instagr.am')) {
    return 'instagram'
  }
  
  return 'other'
}

/**
 * Normalizes TikTok URL to standard format
 */
function normalizeTikTokUrl(url: string): string {
  // Remove query parameters and fragments
  let normalized = url.split('?')[0].split('#')[0]
  
  // Convert vm.tiktok.com to tiktok.com
  normalized = normalized.replace('vm.tiktok.com', 'tiktok.com')
  
  // Ensure it starts with https://
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized
  }
  
  return normalized
}

/**
 * Normalizes Instagram URL to standard format
 */
function normalizeInstagramUrl(url: string): string {
  let normalized = url.split('?')[0].split('#')[0]
  
  // Convert instagr.am to instagram.com
  normalized = normalized.replace('instagr.am', 'instagram.com')
  
  // Ensure it starts with https://
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized
  }
  
  return normalized
}

/**
 * Extracts metadata from Instagram using oEmbed API
 */
async function extractInstagramMetadata(url: string): Promise<Partial<MetadataResult>> {
  try {
    const normalizedUrl = normalizeInstagramUrl(url)
    
    // Instagram oEmbed endpoint
    const oembedUrl = `https://graph.instagram.com/oembed?url=${encodeURIComponent(normalizedUrl)}`
    
    const response = await fetch(oembedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    if (!response.ok) {
      // Try alternative method: fetch the page and parse meta tags
      return await extractInstagramMetadataFromPage(normalizedUrl)
    }
    
    const data = await response.json()
    
    return {
      platform: 'instagram',
      url: normalizedUrl,
      title: data.title || undefined,
      description: data.title || undefined,
      thumbnailUrl: data.thumbnail_url || undefined,
      author: data.author_name || undefined,
      isValid: true
    }
  } catch (error: any) {
    return {
      platform: 'instagram',
      url: normalizeInstagramUrl(url),
      isValid: false,
      error: error.message || 'Erreur lors de l\'extraction des métadonnées Instagram'
    }
  }
}

/**
 * Fallback: Extract Instagram metadata by parsing the page
 */
async function extractInstagramMetadataFromPage(url: string): Promise<Partial<MetadataResult>> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch Instagram page')
    }
    
    const html = await response.text()
    
    // Extract title from og:title or title tag
    const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) ||
                      html.match(/<title>([^<]+)<\/title>/i)
    const title = titleMatch ? titleMatch[1] : undefined
    
    // Extract description from og:description
    const descMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i)
    const description = descMatch ? descMatch[1] : undefined
    
    // Extract image from og:image
    const imageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i)
    const thumbnailUrl = imageMatch ? imageMatch[1] : undefined
    
    return {
      platform: 'instagram',
      url,
      title,
      description,
      thumbnailUrl,
      isValid: true
    }
  } catch (error: any) {
    return {
      platform: 'instagram',
      url,
      isValid: false,
      error: error.message || 'Erreur lors de l\'extraction des métadonnées Instagram'
    }
  }
}

/**
 * Extracts metadata from TikTok
 * Note: TikTok doesn't have a public oEmbed API, so we parse the page
 */
async function extractTikTokMetadata(url: string): Promise<Partial<MetadataResult>> {
  try {
    const normalizedUrl = normalizeTikTokUrl(url)
    
    // Fetch the page
    const response = await fetch(normalizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch TikTok page')
    }
    
    const html = await response.text()
    
    // Extract title from og:title or title tag
    const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) ||
                      html.match(/<title>([^<]+)<\/title>/i)
    const title = titleMatch ? titleMatch[1] : undefined
    
    // Extract description from og:description
    const descMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i)
    const description = descMatch ? descMatch[1] : undefined
    
    // Extract image from og:image
    const imageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i)
    const thumbnailUrl = imageMatch ? imageMatch[1] : undefined
    
    // Extract author from og:site_name or other meta tags
    const authorMatch = html.match(/<meta\s+property="og:site_name"\s+content="([^"]+)"/i) ||
                         html.match(/<meta\s+name="author"\s+content="([^"]+)"/i)
    const author = authorMatch ? authorMatch[1] : undefined
    
    return {
      platform: 'tiktok',
      url: normalizedUrl,
      title,
      description,
      thumbnailUrl,
      author,
      isValid: true
    }
  } catch (error: any) {
    return {
      platform: 'tiktok',
      url: normalizeTikTokUrl(url),
      isValid: false,
      error: error.message || 'Erreur lors de l\'extraction des métadonnées TikTok'
    }
  }
}

/**
 * Main function to extract metadata from a URL
 */
export async function extractMetadata(url: string): Promise<MetadataResult> {
  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    return {
      platform: 'other',
      url: '',
      isValid: false,
      error: 'URL invalide'
    }
  }
  
  const platform = detectPlatform(url)
  
  if (platform === 'tiktok') {
    const result = await extractTikTokMetadata(url)
    return {
      platform: 'tiktok',
      url: result.url || normalizeTikTokUrl(url),
      title: result.title,
      description: result.description,
      thumbnailUrl: result.thumbnailUrl,
      author: result.author,
      isValid: result.isValid ?? false,
      error: result.error
    }
  }
  
  if (platform === 'instagram') {
    const result = await extractInstagramMetadata(url)
    return {
      platform: 'instagram',
      url: result.url || normalizeInstagramUrl(url),
      title: result.title,
      description: result.description,
      thumbnailUrl: result.thumbnailUrl,
      author: result.author,
      isValid: result.isValid ?? false,
      error: result.error
    }
  }
  
  // For other platforms, return basic info
  return {
    platform: 'other',
    url: url.trim(),
    isValid: true
  }
}

