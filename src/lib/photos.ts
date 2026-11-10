/**
 * Photograph for each image slot, keyed by activity id (plus "hero").
 *
 * Leave a key out and the slot shows its illustrated scene instead, so the site never shows a
 * broken or unrelated image. To add a photo, either drop a file in /public/images and point to
 * it ("/images/golden-temple-evening.jpg") or use a full https URL you have the right to use.
 */
export const PHOTO_SOURCES: Record<string, string> = {};
