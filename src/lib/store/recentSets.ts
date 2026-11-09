// The last set a parent opened, on this device only, for the menu's "Continue" card. One set, so
// one card (several looked like copies of the same card), and the parent can hide it. Like recent
// searches, it is a convenience: if storage is blocked or cleared, the menu simply has no card.
const KEY = 'aggarwalkart:recent-sets';

export type RecentSet = { schoolSlug: string; schoolName: string; setId: string; label: string };

const isRecentSet = (value: unknown): value is RecentSet => {
	if (!value || typeof value !== 'object') return false;
	const v = value as Record<string, unknown>;
	return ['schoolSlug', 'schoolName', 'setId', 'label'].every((k) => typeof v[k] === 'string');
};

/** The remembered set, or null. Older saves held a list, latest first: its first entry is used */
export const loadRecentSet = (): RecentSet | null => {
	try {
		const saved: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null');
		const latest: unknown = Array.isArray(saved) ? saved[0] : saved;
		return isRecentSet(latest) ? latest : null;
	} catch {
		return null;
	}
};

export const rememberSet = (set: RecentSet) => {
	const { schoolSlug, schoolName, setId, label } = set;
	try {
		localStorage.setItem(KEY, JSON.stringify({ schoolSlug, schoolName, setId, label }));
	} catch {
		// storage blocked: nothing to remember
	}
};

export const forgetRecentSet = () => {
	try {
		localStorage.removeItem(KEY);
	} catch {
		// storage blocked: nothing was remembered
	}
};
