// The last sets a parent opened, on this device only, for the menu's "Continue" card. Two, for a
// parent with two children. Like recent searches, it is a convenience: if storage is blocked or
// cleared, the menu simply has no card.
const KEY = 'aggarwalkart:recent-sets';
const MAX = 2;

export type RecentSet = { schoolSlug: string; schoolName: string; setId: string; label: string };

const isRecentSet = (value: unknown): value is RecentSet => {
	if (!value || typeof value !== 'object') return false;
	const v = value as Record<string, unknown>;
	return ['schoolSlug', 'schoolName', 'setId', 'label'].every((k) => typeof v[k] === 'string');
};

export const loadRecentSets = (): RecentSet[] => {
	try {
		const saved: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
		return Array.isArray(saved) ? saved.filter(isRecentSet).slice(0, MAX) : [];
	} catch {
		return [];
	}
};

export const rememberSet = (set: RecentSet) => {
	const list = [set, ...loadRecentSets().filter((s) => s.setId !== set.setId)].slice(0, MAX);
	try {
		localStorage.setItem(KEY, JSON.stringify(list));
	} catch {
		// storage blocked: nothing to remember
	}
};
