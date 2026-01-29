// Browser management for product scraping
import puppeteer, { Browser, Page } from 'puppeteer-core'
import chromium from '@sparticuz/chromium'

let browserInstance: Browser | null = null

export async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance
  }

  console.log('[Browser] Launching new browser instance...')

  browserInstance = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 1920, height: 1080 },
    executablePath: await chromium.executablePath(),
    headless: true,
  })

  console.log('[Browser] Browser launched successfully')
  return browserInstance
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close()
    browserInstance = null
    console.log('[Browser] Browser closed')
  }
}

export async function getNewPage(): Promise<Page> {
  const browser = await getBrowser()
  const page = await browser.newPage()

  // Set realistic user agent
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  )

  // Set viewport
  await page.setViewport({ width: 1920, height: 1080 })

  return page
}
