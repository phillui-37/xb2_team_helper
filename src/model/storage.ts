/** localStorage helpers. Private mode / quota failures are ignored. */

export const readJson = <T>(
  key: string,
  parse: (raw: unknown) => T | undefined,
  fallback: T,
): T => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw)
      return fallback
    return parse(JSON.parse(raw) as unknown) ?? fallback
  } catch {
    return fallback
  }
}

export const writeJson = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore quota / private mode
  }
}

export const readFlag = (key: string): boolean => {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

export const writeFlag = (key: string, value: boolean): void => {
  try {
    localStorage.setItem(key, value ? '1' : '0')
  } catch {
    // ignore quota / private mode
  }
}
