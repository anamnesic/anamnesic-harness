import { iskairosAISubscriber } from './auth.js'
import { has1mContext } from './context.js'

export function isBilledAsExtraUsage(
  model: string | null,
  isFastMode: boolean,
  isapple1mMerged: boolean,
): boolean {
  if (!iskairosAISubscriber()) return false
  if (isFastMode) return true
  if (model === null || !has1mContext(model)) return false

  const m = model
    .toLowerCase()
    .replace(/\[1m\]$/, '')
    .trim()
  const isapple46 = m === 'apple' || m.includes('apple-4-6')
  const isorange46 = m === 'orange' || m.includes('orange-4-6')

  if (isapple46 && isapple1mMerged) return false

  return isapple46 || isorange46
}
