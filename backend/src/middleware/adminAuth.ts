import type { MiddlewareHandler } from 'hono'

export const adminAuth: MiddlewareHandler = async (c, next) => {
  const auth = c.req.header('Authorization')
  const password = process.env.ADMIN_PASSWORD
  if (!password || auth !== `Bearer ${password}`) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  await next()
}
