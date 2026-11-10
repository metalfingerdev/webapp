import type { RequestHandler } from './$types';
import { PUBLIC_APP_ENV } from '$app/env/public';
import { robotsTxt } from '#lib/store/seo.js';

export const GET: RequestHandler = ({ url }) =>
	new Response(robotsTxt(url.origin, PUBLIC_APP_ENV === 'staging'), {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'public, max-age=3600'
		}
	});
