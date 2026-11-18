import type { Request } from 'express';
import rateLimit from 'express-rate-limit';

/**
 * The visitor's real IP address.
 * On DigitalOcean App Platform requests pass through its load balancer and CDN, which put the visitor's
 * address in the `do-connecting-ip` header. Without it every visitor would share the proxy's address,
 * and one busy visitor could lock everyone out of the login or the forms.
 */
export function clientIp(req: Request): string {
  const fromPlatform = req.headers['do-connecting-ip'];
  if (typeof fromPlatform === 'string' && fromPlatform) return fromPlatform;
  return req.ip ?? 'unknown';
}

/** A limit on how often one visitor can call a route. */
export function perVisitorLimit(windowMinutes: number, limit: number) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: clientIp,
    // The IP comes from the platform header above, so express-rate-limit's proxy checks don't apply.
    validate: { trustProxy: false, xForwardedForHeader: false },
    message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
  });
}
