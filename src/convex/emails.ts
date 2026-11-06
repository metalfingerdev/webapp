// convex/emails.ts
import { internalAction } from './_generated/server.js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!);

// internalAction (not action): only callable from other Convex functions or the
// admin dashboard, never from the public client. As a plain `action` anyone
// could trigger it to fire mail and burn Resend quota.
export const sendTestEmail = internalAction({
	args: {},
	handler: async () => {
		const { data, error } = await resend.emails.send({
			from: 'onboarding@resend.dev',
			to: 'dev.prajwalp@gmail.com',
			subject: 'Hello World',
			html: '<p>Congrats on sending your <strong>first email</strong>!</p>'
		});

		if (error) {
			console.error(error);
			return { success: false, error };
		}

		return { success: true, data };
	}
});
