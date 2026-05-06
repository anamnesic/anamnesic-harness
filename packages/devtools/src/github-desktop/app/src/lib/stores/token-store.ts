import * as keytar from 'keytar'

// Fallback storage for when keytar fails
const fallbackTokenStore = new Map<string, Map<string, string>>()
const FALLBACK_STORAGE_KEY = 'gh-desktop-fallback-tokens'

// Load fallback tokens from localStorage
function loadFallbackTokens() {
  try {
    const stored = localStorage.getItem(FALLBACK_STORAGE_KEY)
    if (stored) {
      const data = JSON.parse(stored)
      for (const [key, logins] of Object.entries(data)) {
        fallbackTokenStore.set(key, new Map(Object.entries(logins as Record<string, string>)))
      }
    }
  } catch (e) {
    log.warn('Failed to load fallback tokens from localStorage', e)
  }
}

// Save fallback tokens to localStorage
function saveFallbackTokens() {
  try {
    const data: Record<string, Record<string, string>> = {}
    for (const [key, logins] of fallbackTokenStore.entries()) {
      data[key] = Object.fromEntries(logins)
    }
    localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    log.warn('Failed to save fallback tokens to localStorage', e)
  }
}

loadFallbackTokens()

async function setItem(key: string, login: string, value: string) {
  try {
    return await keytar.setPassword(key, login, value)
  } catch (e) {
    log.warn(`keytar.setPassword failed for ${key}/${login}, using fallback`, e)
    // Use fallback storage
    if (!fallbackTokenStore.has(key)) {
      fallbackTokenStore.set(key, new Map())
    }
    fallbackTokenStore.get(key)!.set(login, value)
    saveFallbackTokens()
  }
}

async function getItem(key: string, login: string) {
  try {
    return await keytar.getPassword(key, login)
  } catch (e) {
    log.warn(`keytar.getPassword failed for ${key}/${login}, trying fallback`, e)
    // Try fallback storage
    return fallbackTokenStore.get(key)?.get(login) ?? null
  }
}

async function deleteItem(key: string, login: string) {
  try {
    return await keytar.deletePassword(key, login)
  } catch (e) {
    log.warn(`keytar.deletePassword failed for ${key}/${login}, using fallback`, e)
    // Use fallback storage
    const store = fallbackTokenStore.get(key)
    if (store) {
      store.delete(login)
      saveFallbackTokens()
      return true
    }
    return false
  }
}

export const TokenStore = {
  setItem,
  getItem,
  deleteItem,
}
