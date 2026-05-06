/**
 * Returns the first valid app protocol URL found in argv.
 */
export function findAppURLInArguments(
  argv: ReadonlyArray<string>,
  protocols: ReadonlySet<string>
) {
  const prefixes = Array.from(protocols, protocol => `${protocol}://`)

  for (const arg of argv) {
    if (!prefixes.some(prefix => arg.startsWith(prefix))) {
      continue
    }

    try {
      new URL(arg)
      return arg
    } catch {
      continue
    }
  }

  return null
}
