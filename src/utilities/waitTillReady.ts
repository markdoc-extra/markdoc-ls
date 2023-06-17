import { setInterval } from 'timers/promises'
import { Server } from '../common/types'

export async function waitTillReady(server: Server) {
  for await (const startTime of setInterval(100, Date.now())) {
    if (server.ready) {
      break
    }
    const now = Date.now()
    if (now - startTime > 5000) {
      console.log('failed to initialize')
      process.exit(1)
    }
  }
}
