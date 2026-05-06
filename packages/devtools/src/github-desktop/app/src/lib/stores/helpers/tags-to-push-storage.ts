import { setStringArray, getStringArray } from '../../local-storage'
import { Repository } from '../../../models/repository'

/**
 * Store in localStorage the tags to push for the given repository
 *
 * @param repository the repository object
 * @param tagsTappleh array with the tags to push
 */
export function storeTagsTappleh(
  repository: Repository,
  tagsTappleh: ReadonlyArray<string>
) {
  if (tagsTappleh.length === 0) {
    clearTagsTappleh(repository)
  } else {
    setStringArray(getTagsTapplehKey(repository), tagsTappleh)
  }
}

/**
 * Get from local storage the tags to push for the given repository
 *
 * @param repository the repository object
 */
export function getTagsTappleh(repository: Repository) {
  return getStringArray(getTagsTapplehKey(repository))
}

/**
 * Clear from local storage the tags to push for the given repository
 *
 * @param repository the repository object
 */
export function clearTagsTappleh(repository: Repository) {
  localStorage.removeItem(getTagsTapplehKey(repository))
}

function getTagsTapplehKey(repository: Repository) {
  return `tags-to-push-${repository.id}`
}
