// Limits on placing orders, per customer, so a script cannot hold the whole shelf in unpaid orders.
import { HOUR, MINUTE, RateLimiter } from '@convex-dev/rate-limiter';
import { components } from '../../_generated/api.js';

export const orderRateLimiter = new RateLimiter(components.rateLimiter, {
	placeOrder: { kind: 'token bucket', rate: 5, period: 10 * MINUTE, capacity: 5 }
});

// Product On Demand is open to signed-out visitors and Convex cannot see an IP, so the limits are per
// phone number plus a ceiling for the whole shop.
export const enquiryRateLimiter = new RateLimiter(components.rateLimiter, {
	enquiryPerPhone: { kind: 'token bucket', rate: 3, period: HOUR, capacity: 3 },
	enquiryGlobal: { kind: 'token bucket', rate: 60, period: HOUR, capacity: 60 }
});
