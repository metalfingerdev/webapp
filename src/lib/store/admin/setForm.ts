// Form state for a school set's details; converted to the Convex argument shape on save.
import type { Doc } from '#convex/_generated/dataModel.js';

export type SetForm = {
	type: 'books' | 'uniform';
	label: string;
	classFrom: string;
	classTo: string;
	gender: string;
	uniformType: string;
};

export const emptySet = (): SetForm => ({
	type: 'books',
	label: '',
	classFrom: '1',
	classTo: '1',
	gender: '',
	uniformType: ''
});

export const setState = (set: Doc<'schoolSets'>): SetForm => ({
	type: set.type,
	label: set.label,
	classFrom: String(set.classFrom),
	classTo: String(set.classTo),
	gender: set.gender ?? '',
	uniformType: set.uniformType ?? ''
});

export const toSetInput = (form: SetForm) => ({
	label: form.label,
	classFrom: Number(form.classFrom),
	classTo: Number(form.classTo),
	gender:
		form.type === 'uniform' && form.gender
			? (form.gender as 'boys' | 'girls' | 'unisex')
			: undefined,
	uniformType:
		form.type === 'uniform' && form.uniformType
			? (form.uniformType as 'regular' | 'sports' | 'winter')
			: undefined
});
