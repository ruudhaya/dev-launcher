import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

// Placeholder site config. The marketing landing page lives in src/pages/index.astro;
// Starlight owns everything under /docs (content in src/content/docs/docs/).
export default defineConfig({
  site: 'https://devlaunch.dev',
  integrations: [
    starlight({
      title: 'devlaunch docs',
      description: 'Turn any local dev server into a macOS app you launch from Spotlight.',
      disable404Route: true,
      pagination: false,
      sidebar: [
        {
          label: 'Docs',
          autogenerate: { directory: 'docs' },
        },
      ],
    }),
  ],
});
