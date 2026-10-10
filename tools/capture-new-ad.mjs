import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
const dir = 'livrables/nouveau-design';
await fs.mkdir(dir, { recursive: true });
const browser = await chromium.launch({headless:true});
const page = await browser.newPage({viewport:{width:390,height:780},deviceScaleFactor:2});
await page.goto(process.env.AD_SITE_URL || 'https://parabeauregard.com', {waitUntil:'networkidle',timeout:90000});
await page.addStyleTag({content:'.reveal{opacity:1!important;transform:none!important}.chat-widget,.scroll-progress{display:none!important}'});
console.log('Page:',await page.title());
console.log('Headline:',await page.locator('h1').allTextContents());
for (const [name,y] of [['accueil',0],['univers',620],['selection',1150],['produits',1700]]) {
  await page.evaluate(y=>window.scrollTo(0,y),y);
  await page.waitForTimeout(1200);
  await page.screenshot({path:`${dir}/${name}.png`});
}
await page.goto((process.env.AD_SITE_URL || 'https://parabeauregard.com')+'/categories/soins-visage',{waitUntil:'networkidle',timeout:90000});
await page.evaluate(()=>window.scrollTo(0,750));
await page.waitForTimeout(1200);
await page.screenshot({path:`${dir}/catalogue.png`});
await browser.close();
