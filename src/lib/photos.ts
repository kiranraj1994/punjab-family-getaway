/**
 * Photograph for each image slot, keyed by activity id (plus "hero", "login", "thanks").
 *
 * Every entry is a real photo of that place from Wikimedia Commons, loaded by file name,
 * verified to exist against a real Commons file page. A slot with no entry (or whose photo
 * fails to load) shows its illustrated scene instead, so the site never shows a broken or
 * unrelated image.
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
  hero: { file: "Amritsar-golden-temple-00.JPG", subject: "Golden Temple at night", author: "Ian Sewell" },
  login: { file: "Amritsar-golden-temple-00.JPG", subject: "Golden Temple at night", author: "Ian Sewell" },
  "golden-temple-morning": { file: "Golden temple Shimmering in Golden Morning Amritsar.jpg", subject: "Golden Temple in the early morning", author: "Wikimedia Commons contributor" },
  "wagah-border": { file: "India Pakistan Border Wagha (15027737723).jpg", subject: "Attari–Wagah border ceremony", author: "Koshy Koshy" },
  "jallianwala-bagh": { file: "Jallianwala Bagh Memorial vrtmrgmpksk (63).jpg", subject: "Jallianwala Bagh memorial", author: "Wikimedia Commons contributor" },
  "durgiana-temple": { file: "Durgiana Temple.JPG", subject: "Durgiana Temple", author: "Wikimedia Commons contributor" },
  "gobindgarh-fort": { file: "A far view of the inner gate of Gobindgarh Fort (25064747588).jpg", subject: "Gobindgarh Fort", author: "Wikimedia Commons contributor" },
  "ram-bagh": { file: "Summer Palace of Maharaja Ranjit Singh, Amritsar, Punjab,India.jpg", subject: "Summer Palace in Ram Bagh", author: "Wikimedia Commons contributor" },
  "mustard-fields": { file: "Mustard field (31948407540).jpg", subject: "Mustard flowers in a Punjab field", author: "Wikimedia Commons contributor" },
  "sadda-pind": { file: "Sadda Pind - Best Tourist Destination in Amritsar.jpg", subject: "Sadda Pind, Amritsar", author: "Saddapind" },
  "folk-dance": { file: "Bhangra Dance punjab.jpg", subject: "Bhangra dancers", author: "Wikimedia Commons contributor" },
  "sukhna-lake": { file: "Sukhna lake landscape.jpg", subject: "Sukhna Lake, Chandigarh", author: "Eatcha" },
  // Not independently verified against a real Commons file in this pass — falls back to the
  // illustrated scene rather than risk a broken image. Add a confirmed `file` name to restore.
  thanks: { subject: "Winter wheat field, Punjab", author: "" },
  "golden-temple-evening": { subject: "Golden Temple in the evening", author: "" },
  "partition-museum": { subject: "Amritsar Town Hall, home of the Partition Museum", author: "" },
  "food-experience": { subject: "Amritsari kulcha with chole", author: "" },
  "countryside-drive": { subject: "Winter wheat field, Punjab", author: "" },
  "farm-visit": { subject: "Farmer in Punjab", author: "" },
  "tractor-ride": { subject: "Tractor in a Punjab village", author: "" },
  "bullock-cart": { subject: "Bullock cart in Punjab", author: "" },
  "rock-garden": { subject: "Rock Garden sculptures, Chandigarh", author: "" },
  "garden-of-silence": { subject: "Garden of Silence, Chandigarh", author: "" },
  "zakir-rose-garden": { subject: "Zakir Hussain Rose Garden", author: "" },
  "chandigarh-sightseeing": { subject: "Gandhi Bhawan, Chandigarh", author: "" },
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
