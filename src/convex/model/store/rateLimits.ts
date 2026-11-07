// Limits on placing orders, per customer, so a script cannot hold the whole shelf in unpaid orders.
import { MINUTE, RateLimiter } from '@convex-dev/rate-limiter';
import { components } from '../../_generated/api.js';

export const orderRateLimiter = new RateLimiter(components.rateLimiter, {
	placeOrder: { kind: 'token bucket', rate: 5, period: 10 * MINUTE, capacity: 5 }
});
