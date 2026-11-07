/** A uniform set fits a child when it is for their gender or for everyone */
export const forGender = (set: { gender?: string }, who: string) =>
	!set.gender || set.gender === 'unisex' || set.gender === who;
