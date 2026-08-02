import { MetadataRoute } from 'next';
import { GAME_CATALOG } from '@/lib/gameMetadata';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://icogenx.com';
  const lastModified = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified, changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/about`, lastModified, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/contact`, lastModified, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/privacy`, lastModified, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${baseUrl}/terms`, lastModified, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${baseUrl}/tournaments`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
  ];

  const gamePages: MetadataRoute.Sitemap = [];

  GAME_CATALOG.forEach((game) => {
    gamePages.push({
      url: `${baseUrl}/games/${game.id}`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    });

    if (game.variants) {
      game.variants.forEach((variant) => {
        if (variant.path) {
          gamePages.push({
            url: `${baseUrl}${variant.path}`,
            lastModified,
            changeFrequency: 'weekly',
            priority: 0.8,
          });
        }
      });
    }
  });

  return [...staticPages, ...gamePages];
}
