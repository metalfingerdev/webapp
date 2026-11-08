// The time, for the admin's payment-window warnings, ticking every 30 seconds.
const DAY = 24 * 60 * 60 * 1000;
const IST_OFFSET = 5.5 * 60 * 60 * 1000;

/** Midnight today in India time, as a timestamp. Queries can't read the clock, so they're told. */
export const istDayStart = (now = Date.now()) =>
	Math.floor((now + IST_OFFSET) / DAY) * DAY - IST_OFFSET;

export const useNow = (every = 30_000) => {
	let now = $state(Date.now());
	$effect(() => {
		const timer = setInterval(() => (now = Date.now()), every);
		return () => clearInterval(timer);
	});
	return {
		get value() {
			return now;
		}
	};
};
