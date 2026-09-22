export function combinations<T>(items: T[], k: number): T[][] {
  if (k === 0)
    return [[]]
  if (k > items.length)
    return []
  const out: T[][] = []
  const rec = (start: number, acc: T[]) => {
    if (acc.length === k) {
      out.push(acc.slice())
      return
    }
    for (let i = start; i < items.length; i++) {
      acc.push(items[i] as T)
      rec(i + 1, acc)
      acc.pop()
    }
  }
  rec(0, [])
  return out
}

export function subsets<T>(items: T[]): T[][] {
  const out: T[][] = [[]]
  for (const item of items) {
    const n = out.length
    for (let i = 0; i < n; i++)
      out.push([...out[i]!, item])
  }
  return out
}
