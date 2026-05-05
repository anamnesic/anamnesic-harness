import { describe, it } from 'node:test'
import assert from 'node:assert'

import { findAppURLInArguments } from '../../src/lib/find-app-url-in-argv'

describe('findAppURLInArguments', () => {
  const protocols = new Set([
    'x-github-client',
    'x-github-desktop-auth',
    'x-github-desktop-dev-auth',
  ])

  it('returns the first matching app url', () => {
    const url = findAppURLInArguments(
      [
        'desktop',
        '--flag',
        'x-github-desktop-dev-auth://oauth?code=123&state=abc',
      ],
      protocols
    )

    assert.equal(url, 'x-github-desktop-dev-auth://oauth?code=123&state=abc')
  })

  it('ignores malformed protocol arguments', () => {
    const url = findAppURLInArguments(
      ['desktop', 'x-github-desktop-dev-auth:/oauth?code=123&state=abc'],
      protocols
    )

    assert.equal(url, null)
  })

  it('returns null when no app url is present', () => {
    const url = findAppURLInArguments(['desktop', '--cli-open=/tmp'], protocols)

    assert.equal(url, null)
  })
})
