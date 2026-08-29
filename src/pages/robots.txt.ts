import type { APIContext } from 'astro';

/**
 * robots.txt — generated so the sitemap URL always matches the
 * configured site + base (PUBLIC_SITE / PUBLIC_BASE).
 */
export function GET({ site }: APIContext) {
  const base = import.meta.env.BASE_URL;
  const lines = ['User-agent: *', 'Allow: /'];

  if (site) {
    const sitemapUrl = new URL(`${base}sitemap-index.xml`, site).toString();
    lines.push('', `Sitemap: ${sitemapUrl}`);
  }

  return new Response(lines.join('\n') + '\n', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
