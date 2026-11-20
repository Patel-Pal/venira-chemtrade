/** Inserts Cloudinary auto format/quality + width transforms into a secure_url. Other URLs pass through. */
export function optimizedImage(url: string | undefined | null, width = 600): string | undefined {
  if (!url) return undefined;
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url;
  return url.replace('/upload/', `/upload/f_auto,q_auto,c_limit,w_${width}/`);
}
