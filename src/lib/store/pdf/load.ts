// Thin wrapper around pdfmake. pdfmake and its fonts are about 1 MB, so they are fetched with a
// dynamic import the first time someone asks for a document, and never sit in a page's own code.
// Ported from legacy/src/lib/pdf/pdf-core.ts.
import type { Content, CustomTableLayout, Style, TableCell } from 'pdfmake';

export type { Content, CustomTableLayout, Style, TableCell };

// pdfmake's main entry exports most types but not TDocumentDefinitions; derive it from createPdf
type PdfMakeModule = typeof import('pdfmake');
export type DocDefinition = Parameters<PdfMakeModule['createPdf']>[0];

type PdfMake = {
	vfs?: Record<string, string>;
	createPdf: (def: DocDefinition) => { download: (filename?: string) => Promise<void> | void };
};

let pdfMake: Promise<PdfMake> | null = null;

const getPdfMake = () => {
	pdfMake ??= (async () => {
		// Module shapes differ across bundlers and versions, so resolve them defensively
		const pdfModule = (await import('pdfmake/build/pdfmake')) as Record<string, unknown>;
		const fontModule = (await import('pdfmake/build/vfs_fonts')) as Record<string, unknown>;
		const instance = (pdfModule.default ?? pdfModule) as PdfMake;
		instance.vfs = (fontModule.default ??
			(fontModule as { vfs?: unknown }).vfs ??
			(fontModule as { pdfMake?: { vfs?: unknown } }).pdfMake?.vfs ??
			fontModule) as Record<string, string>;
		return instance;
	})();
	// A failed load (offline) must not stick: the next tap tries again
	pdfMake.catch(() => (pdfMake = null));
	return pdfMake;
};

/** Saves the document as a PDF file */
export const downloadPdf = async (def: DocDefinition, filename: string) => {
	await (await getPdfMake()).createPdf(def).download(filename);
};
