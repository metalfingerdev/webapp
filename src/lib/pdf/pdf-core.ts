// src/lib/pdf/pdf-core.ts
//
// Thin wrapper around pdfmake. pdfmake + its bundled fonts are ~1MB, so it's
// pulled in via dynamic import() — it only loads the first time a user actually
// generates a document, and never ends up in the server bundle.
import type { DocDefinition } from './shared.js';

type PdfMake = {
	vfs?: Record<string, string>;
	createPdf: (def: DocDefinition) => {
		download: (filename?: string) => void;
		print: () => void;
		open: () => void;
	};
};

let pdfMakePromise: Promise<PdfMake> | null = null;

async function getPdfMake(): Promise<PdfMake> {
	if (!pdfMakePromise) {
		pdfMakePromise = (async () => {
			// build/pdfmake = the browser instance; build/vfs_fonts = the Roboto vfs.
			// Module shapes differ across bundlers/versions, so resolve defensively.
			const pdfMod = (await import('pdfmake/build/pdfmake')) as Record<string, unknown>;
			const fontMod = (await import('pdfmake/build/vfs_fonts')) as Record<string, unknown>;

			const pdfMake = ((pdfMod.default ?? pdfMod) as PdfMake);
			const vfs = (fontMod.default ??
				(fontMod as { vfs?: unknown }).vfs ??
				(fontMod as { pdfMake?: { vfs?: unknown } }).pdfMake?.vfs ??
				fontMod) as Record<string, string>;

			pdfMake.vfs = vfs;
			return pdfMake;
		})();
	}
	return pdfMakePromise;
}

/** Trigger a browser download of the given document definition. */
export async function downloadPdf(def: DocDefinition, filename: string): Promise<void> {
	const pdfMake = await getPdfMake();
	pdfMake.createPdf(def).download(filename);
}

/** Open the document in a new tab and invoke the print dialog. */
export async function printPdf(def: DocDefinition): Promise<void> {
	const pdfMake = await getPdfMake();
	pdfMake.createPdf(def).print();
}

/** Open the document in a new tab. */
export async function openPdf(def: DocDefinition): Promise<void> {
	const pdfMake = await getPdfMake();
	pdfMake.createPdf(def).open();
}
