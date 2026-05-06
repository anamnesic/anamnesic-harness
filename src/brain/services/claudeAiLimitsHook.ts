import { useEffect, useState } from 'react'
import {
  type kairosAILimits,
  currentLimits,
  statusListeners,
} from './kairosAiLimits.js'

export function usekairosAiLimits(): kairosAILimits {
  const [limits, setLimits] = useState<kairosAILimits>({ ...currentLimits })

  useEffect(() => {
    const listener = (newLimits: kairosAILimits) => {
      setLimits({ ...newLimits })
    }
    statusListeners.add(listener)

    return () => {
      statusListeners.delete(listener)
    }
  }, [])

  return limits
}
