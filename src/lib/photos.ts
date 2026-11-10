/**
 * Photograph for each image slot, keyed by activity id (plus "hero", "login", "thanks").
 *
 * Every entry is a real photo of that place from Wikimedia Commons, loaded by file name.
 * A slot with no entry (or whose photo fails to load) shows its illustrated scene instead,
 * so the site never shows a broken or unrelated image.
 *
 * To use your own photo, put it in /public/images and set `src` ("/images/wagah.jpg").
 * Commons photos are free to reuse with credit; the credits list in the app links each one
 * to its Commons page, where the author and licence are stated.
 */
export interface PhotoInfo {
  /** Exact file name on Wikimedia Commons. */
  file?: string;
  /** Optional local or absolute URL that overrides `file`. */
  src?: string;
  /** What the photo shows, used in the credits list. */
  subject: string;
  author: string;
}

export const PHOTOS: Record<string, PhotoInfo> = {
  hero: { file: "Golden temple amritsar in night.jpg", subject: "Golden Temple at night", author: "Vishalnagula" },
  login: { file: "Golden temple amritsar in night.jpg", subject: "Golden Temple at night", author: "Vishalnagula" },
  thanks: { file: "Wheat field in Punjab -1.jpg", subject: "Winter wheat field, Punjab", author: "Sarbjit Bahga" },
  "golden-temple-evening": { file: "Harmandir Sahib Glowing Golden Temple.jpg", subject: "Golden Temple in the evening", author: "Raavimohantydelhi" },
  "golden-temple-morning": { file: "Golden Temple reflecting in the Sarovar, Amritsar.jpg", subject: "Golden Temple in the early morning", author: "Ken Wieland" },
  "wagah-border": { file: "Attari–Wagah border, ceremony and crowds Indian side vrtmrgmpksk (152).jpg", subject: "Attari–Wagah border ceremony", author: "Vinayaraj" },
  "jallianwala-bagh": { file: "Jallianwala Bagh Memorial.JPG", subject: "Jallianwala Bagh memorial", author: "Janki1694" },
  "partition-museum": { file: "Town hall Amritsar.jpg", subject: "Amritsar Town Hall, home of the Partition Museum", author: "Dranujpa" },
  "durgiana-temple": { file: "Durgiana Temple, Amritsar.jpg", subject: "Durgiana Temple", author: "Guilhem Vellut" },
  "gobindgarh-fort": { file: "Gobindgarh fort, Amritsar, Punjab, India.jpg", subject: "Gobindgarh Fort", author: "Harvinder Chandigarh" },
  "food-experience": { file: "Amritsari kulcha with cholle.jpg", subject: "Amritsari kulcha with chole", author: "Vipul7229" },
  "ram-bagh": { file: "Summer Palace of Maharaja Ranjit Singh, Amritsar, Punjab,India.jpg", subject: "Summer Palace in Ram Bagh", author: "Wikimedia Commons contributor" },
  "countryside-drive": { file: "Wheat field in Punjab -1.jpg", subject: "Winter wheat field, Punjab", author: "Sarbjit Bahga" },
  "mustard-fields": { file: "Punjabi Mustard Flowers.JPG", subject: "Mustard flowers in a Punjab field", author: "Satdeep Gill" },
  "farm-visit": { file: "Agriculture in India, Farmer Punjab.jpg", subject: "Farmer in Punjab", author: "Neil Palmer / CIAT" },
  "tractor-ride": { file: "Mahindra tractor.JPG", subject: "Tractor in a Punjab village", author: "Zenit" },
  "bullock-cart": { file: "Bullock Cart in Punjab.jpg", subject: "Bullock cart in Punjab", author: "Sarbjit Bahga" },
  "sadda-pind": { file: "Sadda Pind - Best Tourist Destination in Amritsar.jpg", subject: "Sadda Pind, Amritsar", author: "Saddapind" },
  "folk-dance": { file: "Bhangra Dance punjab.jpg", subject: "Bhangra dancers", author: "Onef9day" },
  "rock-garden": { file: "Rock Garden, Chandigarh-statues.jpg", subject: "Rock Garden sculptures, Chandigarh", author: "Ian Brown" },
  "sukhna-lake": { file: "On Sukhna Lake 11.jpg", subject: "Sukhna Lake, Chandigarh", author: "Kritzolina" },
  "garden-of-silence": { file: "Garden of Silence, Chandigarh.jpg", subject: "Garden of Silence, Chandigarh", author: "Wikimedia Commons contributor" },
  "zakir-rose-garden": { file: "Chandigarh India Rose Garden 02.jpg", subject: "Zakir Hussain Rose Garden", author: "Wikimedia Commons contributor" },
  "chandigarh-sightseeing": { file: "Gandhi Bhawan, Chandigarh.jpg", subject: "Gandhi Bhawan, Chandigarh", author: "Wikimedia Commons contributor" },
};

const COMMONS = "https://commons.wikimedia.org/wiki/";

export function photoUrl(id: string, width = 960): string | undefined {
  const p = PHOTOS[id];
  if (!p) return undefined;
  if (p.src) return p.src;
  return p.file ? `${COMMONS}Special:FilePath/${encodeURIComponent(p.file)}?width=${width}` : undefined;
}

/** Unique Commons photos with a link to the page that states author and licence. */
export function photoCredits(): { subject: string; author: string; page: string }[] {
  const seen = new Set<string>();
  return Object.values(PHOTOS)
    .filter((p) => p.file && !seen.has(p.file) && seen.add(p.file))
    .map((p) => ({ subject: p.subject, author: p.author, page: `${COMMONS}File:${encodeURIComponent(p.file!.replace(/ /g, "_"))}` }));
}
