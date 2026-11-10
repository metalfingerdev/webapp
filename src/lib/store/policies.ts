// The policy texts. Each is the client's own wording, copied from the live site and checked by them
// (dictated rule: no legal or tax wording is invented). An empty `sections` list means "not
// confirmed yet": the page then shows a draft notice instead of text.
// TODO (dictate): the client confirms the text of all eight, from aggarwalkart.in.

export type PolicySection = { heading?: string; paragraphs: string[] };
export type PolicyText = {
	/** When the client last confirmed the wording, e.g. "10 November 2026" */
	updated?: string;
	sections: PolicySection[];
};

export const policyTexts: Record<string, PolicyText> = {
	privacy: { sections: [] },
	terms: { sections: [] },
	cancellation: { sections: [] },
	'refund-and-return': { sections: [] },
	'shipping-and-delivery': { sections: [] },
	payment: { sections: [] },
	'grievance-redressal': { sections: [] },
	disclaimer: { sections: [] }
};
