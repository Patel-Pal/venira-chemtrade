/**
 * Structured seed data transcribed from source/venira-chemtrade-catalogue.pdf (see docs/PDF_PRODUCT_EXTRACTION.md).
 * ONLY product names are known. No descriptions, prices, sizes, ingredients or claims are invented here.
 * `source` keeps the exact printed text; `name` applies only unambiguous spelling corrections.
 * Items are seeded as published with dataStatus "pending_admin_input" and price-on-request.
 */
export interface SeedItem {
  source: string;
  name: string;
}

const fix: Record<string, string> = {
  Niaicinamide: 'Niacinamide',
  'Liposomal NIacinamide': 'Liposomal Niacinamide',
  Squalne: 'Squalane',
  Climbazol: 'Climbazole',
  'Acrylates Copolyner': 'Acrylates Copolymer',
  'Xantham Gum': 'Xanthan Gum',
  'Phenoxyethanoal & Ethylhexyl Glycerine': 'Phenoxyethanol & Ethylhexyl Glycerine',
  'Argan OIl': 'Argan Oil',
  'All Natural Ingrdients': 'All Natural Ingredients',
  'Liposomal Vitamin c': 'Liposomal Vitamin C',
  'Hyaluronic acid': 'Hyaluronic Acid',
  'Aloe vera Extract': 'Aloe Vera Extract',
  'Myristic acid': 'Myristic Acid',
  'Stearic acid': 'Stearic Acid',
};

const items = (names: string[]): SeedItem[] => names.map((s) => ({ source: s, name: fix[s] ?? s }));

export interface SeedCategory {
  name: string;
  slug: string;
  description?: string;
  items: SeedItem[];
}

export const CATALOGUE: SeedCategory[] = [
  {
    name: 'Emulsifiers', slug: 'emulsifiers',
    items: items([
      'Cetearyl Alcohol or Cetostearyl Alcohol', 'Glyceryl Stearate', 'Myristic acid', 'Stearic acid', 'Emulsifying wax',
      'Glyceryl Stearate (and) PEG-100 Stearate', 'All Natural emulsifying agents', 'All Silicone emulsifiers',
    ]),
  },
  { name: 'Beads', slug: 'beads', items: items(['Exfoliating Beads', 'Dissolving Beads', 'Color Changing Beads']) },
  {
    name: 'Actives', slug: 'actives',
    items: items([
      'Niaicinamide', 'Alpha Arbutin', 'Kojic Acid', 'Salicylic Acid', 'Azelaic Acid', 'Retinol', 'Peptides', 'Tranexamic Acid',
      'Hyaluronic acid', 'Ceramides', 'Ethyl Ascorbic Acid', 'Redensyl', 'Anagain', 'Procapil', 'Baicapil',
    ]),
  },
  {
    name: 'Skincare & Haircare', slug: 'skincare-haircare',
    items: items([
      'Keratin Protein', 'Squalne', 'Liposomal Vitamin c', 'Liposomal NIacinamide', 'Climbazol', 'Ketoconazole', 'Piroctone Olamine',
      'ZPTO', 'Anti Ageing Actives', 'Anti Acne Actives', 'Anti Pigment Actives', 'Skin Lightening Agents', 'Scalp Care',
      'Hair Growth Promoter', 'Anti Hairfall Actives',
    ]),
  },
  {
    name: 'Surfactants', slug: 'surfactants',
    items: items([
      'Cocamidopropyl Betaine', 'Cocamide DEA', 'Sarcosinate', 'Coco-Glucoside', 'Decyl Glucoside', 'Lauryl Glucoside',
      'Sodium Cocoyl Isethionate', 'SLS Powder', 'Sodium Methyl Cocoyl Taurate', 'Sodium Laureth Sulfate',
    ]),
  },
  {
    name: 'Silicones', slug: 'silicones',
    items: items([
      'Cyclopentasiloxane', 'Dimethicone 350', 'Cyclopentasiloxane & Dimethiconol', 'Phenyl Trimethicone', 'PEG 10 Dimethicone',
      'PEG 12 Dimethicone', 'Elastomer Gel', 'Amodimethicone', 'Caprylyl Methicone',
    ]),
  },
  {
    name: 'UV Filters', slug: 'uv-filters',
    items: items([
      'Avobenzone', 'Benzophenone 3', 'Benzophenone 4', 'Octyl Methoxy Cinnamate', 'Octocrylene', 'Octyl Salicylate', 'Micronized TiO2',
      'Micronized ZnO', 'Homosalate', 'Octyl Dodeconal', 'Tinosorb S', 'Suncare Blends',
    ]),
  },
  {
    name: 'Oils & Butters', slug: 'oils-butters',
    items: items([
      'Almond Oil', 'Shea Butter', 'Mango Butter', 'Coco Butter', 'Almond Butter', 'Jojoba Butter', 'Argan OIl', 'Avocado Oil',
      'Coconut Oil', 'Hemp Seed Oil', 'Jojoba Oil', 'Olive Oil', 'Sesame Seed Oil', 'Vitamin E', 'Aloe Butter', 'Avocado Butter',
      'Turmeric Butter', 'Castor Oil', 'All Essential Oil',
    ]),
  },
  {
    name: 'Extracts', slug: 'extracts',
    items: items([
      'Aloe vera Extract', 'Cucumber Extract', 'Licorice Extract', 'Mulberry Extract', 'Amla Extract', 'Arnica Extract',
      'Blue Berry Extract', 'Red Algae Extract', 'Rosemary Extract', 'Saffron Extract', 'Tea Tree Extract',
    ]),
  },
  {
    name: 'Speciality Chemicals', slug: 'speciality-chemicals',
    items: items([
      'PEG-40 Hydrogenated Castor Oil', 'Triethanolamine', 'Propylene Glycol', 'PEG-150 Distearate', 'Glycerine', 'D Panthenol',
      'Acrylates Copolyner', 'Xantham Gum', 'All Carbomer', 'EDTA', 'Phenoxyethanoal & Ethylhexyl Glycerine', 'DMDMH',
      'Isopropyl Myristate', 'Zinc PCA', 'Lactic Acid', 'Glycolic Acid', 'Polyquaternium (7, 10, 11, 22, 37, 39, 47)',
      'Cetrimonium Chloride', 'Behentrimonium Chloride', 'Caprylic/Capric Triglyceride', 'Thioglycolic Acid', 'Isododecane',
      'Trimethylsiloxysilicate', 'SILICA', 'Talc', 'Beeswax & All Waxes', 'Hydroxyethyl Urea', 'Hydroxyethylcellulose',
      'Guar Hydroxypropyltrimonium Chloride', 'Ethylhexyl Palmitate', 'Betaine', 'Menthol', 'Isononyl Isononanoate', 'Octyldodecanol',
    ]),
  },
  {
    name: 'Advanced Ingredients', slug: 'advanced-ingredients',
    items: items(['Moisturizers', 'Thickeners', 'Conditioning Agents', 'Color Cosmetic', 'Fragrances', 'All Natural Ingrdients']),
  },
];

/** Contact details printed on the last page of the PDF. */
export const PDF_CONTACT = {
  address: 'Prayosha Pride, Sachin Eklehra Road, Dindoli, Surat, Gujarat 394210',
  phone: '+91 8669421221',
  tagline: 'The power behind the beauty products',
};
