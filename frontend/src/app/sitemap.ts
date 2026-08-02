import { MetadataRoute } from 'next';
import { GAME_CATALOG } from '@/lib/gameMetadata';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://icogenx.com';
  const lastModified = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${baseUrl}`, lastModified, changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/about`, lastModified, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/contact`, lastModified, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/privacy`, lastModified, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${baseUrl}/terms`, lastModified, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${baseUrl}/tournaments`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/teams`, lastModified, changeFrequency: 'weekly', priority: 0.7 },
  ];

  const categories = ['strategy', 'logic', 'memory', 'quick', 'reflex', 'cards', 'party', 'couples'];
  const categoryPages: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${baseUrl}/category/${cat}`,
    lastModified,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const urlMap = new Map<string, MetadataRoute.Sitemap[number]>();

  // Add static and category pages to map to prevent duplicates
  [...staticPages, ...categoryPages].forEach((item) => {
    urlMap.set(item.url, item);
  });

  // Dynamically map all games and variants from GAME_CATALOG
  GAME_CATALOG.forEach((game) => {
    const gameUrl = `${baseUrl}/games/${game.id}`;
    if (!urlMap.has(gameUrl)) {
      urlMap.set(gameUrl, {
        url: gameUrl,
        lastModified,
        changeFrequency: 'weekly',
        priority: 0.9,
      });
    }

    if (game.variants) {
      game.variants.forEach((variant) => {
        if (variant.path) {
          const cleanPath = variant.path.startsWith('/') ? variant.path : `/${variant.path}`;
          const variantUrl = `${baseUrl}${cleanPath}`;
          if (!urlMap.has(variantUrl)) {
            urlMap.set(variantUrl, {
              url: variantUrl,
              lastModified,
              changeFrequency: 'weekly',
              priority: 0.8,
            });
          }
        }
      });
    }
  });

  return Array.from(urlMap.values());
}
