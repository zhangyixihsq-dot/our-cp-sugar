import type { Context } from '@deepseek-ai/cordis'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { PET_ACTIVITY_ENDPOINT, recordPetActivity, type PetActivityState } from './pet-state.ts'

export const inject = ['webServer']

/** Publishes a monotonic model-turn signal for the browser-side desktop pet. */
export function apply(ctx: Context): void {
  const state: PetActivityState = { sequence: 0, startedAt: 0, completedSequence: 0, completedAt: 0 }

  ctx.effect(() => {
    const disposeEvent = ctx.on('session/event', (_session: Session, event: SessionEvent) => {
      recordPetActivity(state, event.type)
    })
    const route: WebRoute = {
      kind: 'exact',
      path: PET_ACTIVITY_ENDPOINT,
      handler: (req, res): void => {
        if (req.method !== 'GET') {
          res.writeHead(405, { allow: 'GET' })
          res.end()
          return
        }
        const body = JSON.stringify(state)
        res.writeHead(200, {
          'cache-control': 'no-store',
          'content-type': 'application/json; charset=utf-8',
        })
        res.end(body)
      },
    }
    const disposeRoute = ctx.webServer.register(route)
    return () => {
      disposeRoute()
      disposeEvent()
    }
  }, 'ui-custom-background: desktop-pet activity')
}
