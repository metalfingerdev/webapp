// All store UI text, so Hindi can be added later without touching components.
export const strings = {
	brand: 'Aggarwal Kart',
	tagline: 'School books, uniforms and stationery, delivered across India',
	nav: {
		menu: 'Menu',
		search: 'Search',
		close: 'Close',
		categories: 'Shop by category',
		schools: 'Schools',
		allProducts: 'All products',
		account: 'My account',
		schoolsSoon: 'Book sets and uniforms by school are coming soon.'
	},
	search: {
		title: 'Search',
		label: 'Search by title, author or ISBN',
		placeholder: 'Search books',
		seeAll: 'See all results',
		none: 'Nothing found. Try another word.',
		searching: 'Searching'
	},
	home: {
		title: 'Aggarwal Kart',
		headline: 'Your child’s school year, in one order.',
		lead: 'School books and uniforms by school and class, plus stationery and general books.',
		shopAll: 'Browse all books',
		schoolsTitle: 'Find your school',
		schoolsSoon: 'Book sets and uniforms by class are coming soon.',
		promisesTitle: 'Why parents order here',
		promises: [
			{ title: 'High quality', text: 'Books and uniforms checked before they leave the shop.' },
			{
				title: 'Fast delivery',
				text: 'Packed at our Faridabad shop and sent by courier across India.'
			},
			{ title: 'Fair prices', text: 'Prices include GST. What you see is what you pay.' }
		],
		careTitle: 'Chosen with care',
		careText:
			'We are a bookshop first. Every title on the shelf is one we would hand to a parent at the counter.',
		contactTitle: 'Talk to us',
		contactPhone: 'Phone',
		contactWhatsapp: 'WhatsApp',
		contactEmail: 'Email',
		contactAddress: 'Visit the shop'
	},
	shop: {
		title: 'Shop',
		all: 'All products',
		resultsFor: (text: string) => `Results for “${text}”`,
		count: (n: number) => (n === 1 ? '1 product' : `${n} products`),
		empty: 'No products match. Try clearing a filter.',
		showMore: 'Show more',
		loading: 'Loading',
		subcategories: 'In this section',
		filters: 'Filters',
		filterClass: 'Class',
		filterAnyClass: 'Any class',
		filterMin: 'Lowest price (₹)',
		filterMax: 'Highest price (₹)',
		filterInStock: 'In stock only',
		apply: 'Apply filters',
		clear: 'Clear'
	},
	product: {
		by: 'by',
		from: 'From',
		off: (percent: number) => `${percent}% off`,
		mrp: 'MRP',
		inclusiveOfTax: 'Price includes GST',
		inStock: 'In stock',
		fewLeft: 'Few left',
		out: 'Out of stock',
		options: 'Sizes and prices',
		details: 'Details',
		publisher: 'Publisher',
		isbn: 'ISBN',
		edition: 'Edition',
		subject: 'Subject',
		class: 'Class',
		notFound: 'We could not find that product.',
		backToShop: 'Back to the shop'
	},
	footer: {
		account: 'Account',
		myAccount: 'My account',
		policies: 'Policies',
		gstin: 'GSTIN',
		rights: (year: number, name: string) => `© ${year} ${name}`
	},
	policies: {
		soon: 'This page is being prepared. It will be here before the store opens.',
		list: [
			{ slug: 'privacy', title: 'Privacy Policy' },
			{ slug: 'terms', title: 'Terms & Conditions' },
			{ slug: 'cancellation', title: 'Cancellation Policy' },
			{ slug: 'refund-and-return', title: 'Refund & Return Policy' },
			{ slug: 'shipping-and-delivery', title: 'Shipping & Delivery Policy' },
			{ slug: 'payment', title: 'Payment Policy' },
			{ slug: 'grievance-redressal', title: 'Grievance Redressal' },
			{ slug: 'disclaimer', title: 'Disclaimer' }
		]
	}
} as const;
