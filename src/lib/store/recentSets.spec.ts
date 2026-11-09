import { beforeEach, describe, expect, it } from 'vitest';
import { forgetRecentSet, loadRecentSet, rememberSet } from './recentSets';

const KEY = 'aggarwalkart:recent-sets';
const first = { schoolSlug: 'a', schoolName: 'School A', setId: 's1', label: 'Class 1 books' };
const second = { schoolSlug: 'b', schoolName: 'School B', setId: 's2', label: 'Class 2 books' };

describe('the Continue card', () => {
	beforeEach(() => localStorage.clear());

	it('keeps one set, the latest, so the menu shows one card', () => {
		rememberSet(first);
		rememberSet(second);
		rememberSet(second);
		expect(loadRecentSet()).toEqual(second);
		expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual(second);
	});

	it('reads an old list save as its latest set, ignores a broken one, and hides when forgotten', () => {
		localStorage.setItem(KEY, JSON.stringify([second, first]));
		expect(loadRecentSet()).toEqual(second);

		forgetRecentSet();
		expect(loadRecentSet()).toBeNull();

		localStorage.setItem(KEY, '{not json');
		expect(loadRecentSet()).toBeNull();
		localStorage.setItem(KEY, JSON.stringify({ setId: 's1' }));
		expect(loadRecentSet()).toBeNull();
	});
});
