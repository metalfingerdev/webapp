// The "your order is on its way" email. Sent through the Resend component from the mutation that
// ships the order; skipped when no sender address is set (no domain yet) or the customer has only a
// placeholder email (phone sign-up).
import type { MutationCtx } from '../../_generated/server.js';
import { components } from '../../_generated/api.js';
import { resend } from '../../email.js';
import { escapeHtml, heading, paragraph, renderBaseEmail } from '../emails/templates/baseEmail.js';

export const sendShippedEmail = async (
	ctx: MutationCtx,
	args: {
		userId: string;
		orderNumber: string;
		courier?: string;
		awb?: string;
		trackingUrl?: string;
	}
) => {
	const from = process.env.EMAIL_SEND_FROM;
	if (!from) return;
	const user = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
		model: 'user',
		where: [{ field: '_id', value: args.userId }]
	})) as { email?: string; name?: string } | null;
	const to = user?.email;
	if (!to || to.toLowerCase().endsWith('.invalid')) return;

	const lines = [
		heading(`Order ${args.orderNumber} is on its way`),
		user?.name ? paragraph(`Hi ${escapeHtml(user.name)},`) : '',
		args.courier && args.awb
			? paragraph(
					`It was handed to <strong>${escapeHtml(args.courier)}</strong>. Tracking number: <strong>${escapeHtml(args.awb)}</strong>.`
				)
			: paragraph('It is out for delivery.'),
		args.trackingUrl
			? paragraph(`<a href="${escapeHtml(args.trackingUrl)}">Track the parcel</a>`)
			: ''
	];
	await resend.sendEmail(ctx, {
		from,
		to,
		subject: `Order ${args.orderNumber} is on its way`,
		html: renderBaseEmail({ children: lines.join(''), previewText: 'Your order is on its way' })
	});
};
