const { getConnector } = require('./src/lib/scraper/connectors');
const { politeFetch, downloadImage, searchProductImages } = require('./src/lib/scraper/http');

(async () => {
  // Test sur une source active (parapharma.ma est bloqué par Cloudflare → retiré)
  const connector = getConnector('mapara.ma');
  if (!connector) { console.log('No connector'); return; }

  // Test 1: Fetch a listing page and collect product links
  console.log('=== Test 1: Fetching listing page ===');
  const listUrl = connector.listUrls[0].url;
  try {
    const $ = await politeFetch(listUrl, [500, 1000]);
    const links = [];
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && connector.productUrlPattern.test(href)) {
        links.push(new URL(href, connector.baseUrl).toString());
      }
    });
    console.log(`Found ${links.length} product links on listing page`);

    if (links.length > 0) {
      const productUrl = links[0];
      console.log(`\n=== Test 2: Fetching product: ${productUrl} ===`);
      const $p = await politeFetch(productUrl, [500, 1000]);
      const raw = connector.parseProduct($p, productUrl);

      if (raw) {
        console.log(`Name: ${raw.name}`);
        console.log(`Brand: ${raw.brand}`);
        console.log(`Price: ${raw.price}`);
        console.log(`Promo: ${raw.promoPrice}`);
        console.log(`Availability: ${raw.availability}`);
        console.log(`imageUrls count: ${raw.imageUrls.length}`);
        console.log(`imageUrls: ${JSON.stringify(raw.imageUrls)}`);

        // Try to download the first image
        if (raw.imageUrls.length > 0) {
          console.log(`\n=== Test 3: Downloading first image ===`);
          console.log(`URL: ${raw.imageUrls[0]}`);
          const local = await downloadImage(raw.imageUrls[0], connector.baseUrl);
          console.log(`Result: ${local}`);
        } else {
          console.log('\n=== No image URLs found! Trying alternative selectors ===');
          $p('img').each((i, el) => {
            const src = $p(el).attr('src') || $p(el).attr('data-src') || '';
            const className = $p(el).attr('class') || '';
            console.log(`  img[${i}]: src=${src} class=${className}`);
          });
          const ogImage = $p("meta[property='og:image']").attr('content');
          console.log(`  og:image = ${ogImage || 'NONE'}`);
        }
      } else {
        console.log('parseProduct returned null');
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
  }

  // Test 4: Search web for images
  console.log('\n=== Test 4: Web search for images ===');
  try {
    const results = await searchProductImages('Ducray Kelual DS Creme Apaisante 40ml');
    console.log(`Found ${results.length} images from DuckDuckGo`);
    for (const url of results) {
      console.log(`  ${url}`);
    }
  } catch (err) {
    console.error('Search error:', err.message);
  }
})();