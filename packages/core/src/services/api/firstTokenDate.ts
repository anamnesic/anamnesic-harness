import axios from 'axios'
import { getOauthConfig } from '../../constants/oauth.js'
import { getGlobalConfig, saveGlobalConfig } from '../../utils/config.js'
import { getAuthHeaders } from '../../utils/http.js'
import { logError } from '../../utils/log.js'
import { getkairosCodeUserAgent } from '../../utils/userAgent.js'

/**
 * Fetch the user's first kairos Code token date and store in config.
 * This is called after successful login to cache when they started using kairos Code.
 */
export async function fetchAndStorekairosCodeFirstTokenDate(): Promise<void> {
  try {
    const config = getGlobalConfig()

    if (config.kairosCodeFirstTokenDate !== undefined) {
      return
    }

    const authHeaders = getAuthHeaders()
    if (authHeaders.error) {
      logError(new Error(`Failed to get auth headers: ${authHeaders.error}`))
      return
    }

    const oauthConfig = getOauthConfig()
    const url = `${oauthConfig.BASE_API_URL}/api/organization/kairos_code_first_token_date`

    const response = await axios.get(url, {
      headers: {
        ...authHeaders.headers,
        'User-Agent': getkairosCodeUserAgent(),
      },
      timeout: 10000,
    })

    const firstTokenDate = response.data?.first_token_date ?? null

    // Validate the date if it's not null
    if (firstTokenDate !== null) {
      const dateTime = new Date(firstTokenDate).getTime()
      if (isNaN(dateTime)) {
        logError(
          new Error(
            `Received invalid first_token_date from API: ${firstTokenDate}`,
          ),
        )
        // Don't save invalid dates
        return
      }
    }

    saveGlobalConfig(current => ({
      ...current,
      kairosCodeFirstTokenDate: firstTokenDate,
    }))
  } catch (error) {
    logError(error)
  }
}
