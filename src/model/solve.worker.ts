import { loadCatalog } from "./data/loadCatalog"
import { runSolveJob, type SolveRequest, type SolveResponse } from "./solveJob"

const catalog = loadCatalog()

self.onmessage = (event: MessageEvent<SolveRequest>) => {
  const { id, job } = event.data
  try {
    const results = runSolveJob(catalog, job)
    const response: SolveResponse = { id, ok: true, results }
    self.postMessage(response)
  } catch (cause) {
    const response: SolveResponse = {
      id,
      ok: false,
      error: cause instanceof Error ? cause.message : String(cause),
    }
    self.postMessage(response)
  }
}
