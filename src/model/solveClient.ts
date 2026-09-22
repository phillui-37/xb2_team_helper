import type { Catalog, TeamResult } from "../types/common"
import { runSolveJob, type SolveJob, type SolveRequest, type SolveResponse } from "./solveJob"

let worker: Worker | undefined
let workerFailed = false
let nextId = 0

const createWorker = (): Worker | undefined => {
  if (workerFailed || typeof Worker === "undefined")
    return undefined
  if (!worker) {
    try {
      worker = new Worker(new URL("./solve.worker.ts", import.meta.url), { type: "module" })
    } catch {
      workerFailed = true
      return undefined
    }
  }
  return worker
}

/** Run a solve in a worker when available; fall back to the UI thread. */
export function solveAsync(catalog: Catalog, job: SolveJob): Promise<TeamResult[]> {
  const target = createWorker()
  if (!target)
    return Promise.resolve(runSolveJob(catalog, job))

  const id = ++nextId
  return new Promise((resolve, reject) => {
    const onMessage = (event: MessageEvent<SolveResponse>) => {
      if (event.data.id !== id)
        return
      target.removeEventListener("message", onMessage)
      target.removeEventListener("error", onError)
      if (event.data.ok)
        resolve(event.data.results)
      else
        reject(new Error(event.data.error))
    }
    const onError = () => {
      target.removeEventListener("message", onMessage)
      target.removeEventListener("error", onError)
      workerFailed = true
      resolve(runSolveJob(catalog, job))
    }
    target.addEventListener("message", onMessage)
    target.addEventListener("error", onError)
    const request: SolveRequest = { id, job }
    try {
      target.postMessage(request)
    } catch {
      onError()
    }
  })
}
