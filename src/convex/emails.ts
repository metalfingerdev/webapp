// convex/emails.ts
import { action } from './_generated/server.js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!);

export const sendTestEmail = action({
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
