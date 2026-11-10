// What the shop may show or prefill from the signed-in account. A phone-only sign-up has its number
// as its name and a `...@phone.invalid` placeholder email: neither is a real name or address.
type Account = {
	name?: string | null;
	email?: string | null;
	phoneNumber?: string | null;
} | null;

export const accountName = (me: Account | undefined) =>
	me?.name && !/^\+?\d[\d\s]*$/.test(me.name) ? me.name : '';

export const accountEmail = (me: Account | undefined) =>
	me?.email && !me.email.endsWith('.invalid') ? me.email : '';

/** `+91XXXXXXXXXX` as the 10 digits the forms ask for */
export const accountPhone = (me: Account | undefined) =>
	me?.phoneNumber?.replace(/^\+91/, '') ?? '';
