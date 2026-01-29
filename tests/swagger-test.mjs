import { chromium } from 'playwright'

const BEARER_TOKEN = 'Bearer w1U7me0P1Nv2yS3Rm8h9JkN3I6d6aQwU7TgF4vVjBnLzPsEi5R'
const SWAGGER_URL = 'https://crm-service.speccon.co.za/swagger/index.html'

;(async () => {
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()

  console.log('=== Opening Swagger UI ===')
  await page.goto(SWAGGER_URL, { waitUntil: 'networkidle', timeout: 30000 })
  console.log('Page title:', await page.title())

  // Take initial screenshot
  await page.screenshot({ path: 'tests/swagger-01-loaded.png', fullPage: false })
  console.log('Screenshot saved: swagger-01-loaded.png')

  // Click the Authorize button to enter the bearer token
  console.log('\n=== Authorizing with Bearer Token ===')
  const authorizeBtn = page.locator('button.btn.authorize')
  if (await authorizeBtn.isVisible()) {
    await authorizeBtn.click()
    await page.waitForTimeout(1000)

    // Enter the token in the input field
    const tokenInput = page.locator('input[data-name="bearerAuth"]').first()
      .or(page.locator('.auth-container input[type="text"]').first())

    if (await tokenInput.isVisible()) {
      await tokenInput.fill(BEARER_TOKEN)
      console.log('Token entered')

      // Click Authorize in the modal
      const modalAuthorize = page.locator('.auth-btn-wrapper button.btn-done')
        .or(page.locator('.auth-btn-wrapper .authorize'))

      // Find the authorize button (not the close button)
      const authButtons = page.locator('.auth-btn-wrapper button')
      const count = await authButtons.count()
      for (let i = 0; i < count; i++) {
        const text = await authButtons.nth(i).textContent()
        if (text.trim().toLowerCase() === 'authorize') {
          await authButtons.nth(i).click()
          console.log('Clicked Authorize in modal')
          break
        }
      }

      await page.waitForTimeout(1000)
      await page.screenshot({ path: 'tests/swagger-02-authorized.png', fullPage: false })

      // Close the modal
      const closeBtn = page.locator('.auth-btn-wrapper button')
      const closeCount = await closeBtn.count()
      for (let i = 0; i < closeCount; i++) {
        const text = await closeBtn.nth(i).textContent()
        if (text.trim().toLowerCase() === 'close') {
          await closeBtn.nth(i).click()
          break
        }
      }
      await page.waitForTimeout(500)
    } else {
      console.log('Token input not found - taking screenshot')
      await page.screenshot({ path: 'tests/swagger-02-auth-modal.png', fullPage: false })
    }
  } else {
    console.log('No Authorize button found')
  }

  // Now find and expand the Tenant CreateTenant endpoint
  console.log('\n=== Finding Tenant/CreateTenant endpoint ===')

  // First try to find the Tenant section - look for the CreateTenant operation
  const createTenantOp = page.locator('[id*="Tenant"][id*="CreateTenant"], [id*="tenant"][id*="create"]').first()
    .or(page.locator('text=POST /api/Tenant/CreateTenant').first())

  // Scroll through to find the Tenant section
  // Try clicking on the Tenant tag to expand it
  const tenantSection = page.locator('.opblock-tag[data-tag="Tenant"]')
    .or(page.locator('h3:has-text("Tenant")').first())
    .or(page.locator('span:has-text("Tenant")').first())

  // Scroll to find the tenant section
  await page.evaluate(() => {
    const elements = document.querySelectorAll('.opblock-tag-section, .opblock-tag')
    for (const el of elements) {
      if (el.textContent.includes('Tenant')) {
        el.scrollIntoView()
        el.click()
        break
      }
    }
  })
  await page.waitForTimeout(1000)
  await page.screenshot({ path: 'tests/swagger-03-tenant-section.png', fullPage: false })

  // Find and click the CreateTenant POST endpoint
  const createTenantBlock = page.locator('.opblock-post').filter({ hasText: 'CreateTenant' }).first()
  if (await createTenantBlock.isVisible()) {
    await createTenantBlock.click()
    await page.waitForTimeout(1000)
    console.log('Expanded CreateTenant endpoint')
  } else {
    // Try to find it by scrolling
    await page.evaluate(() => {
      const blocks = document.querySelectorAll('.opblock')
      for (const block of blocks) {
        if (block.textContent.includes('CreateTenant')) {
          block.scrollIntoView()
          block.querySelector('.opblock-summary')?.click()
          break
        }
      }
    })
    await page.waitForTimeout(1000)
  }

  await page.screenshot({ path: 'tests/swagger-04-createtenant-expanded.png', fullPage: false })

  // Click "Try it out"
  console.log('\n=== Clicking Try it out ===')
  const tryItOutBtn = page.locator('.opblock-post')
    .filter({ hasText: 'CreateTenant' })
    .locator('button.try-out__btn')
    .first()

  if (await tryItOutBtn.isVisible()) {
    await tryItOutBtn.click()
    await page.waitForTimeout(500)
    console.log('Clicked Try it out')
  } else {
    // Fallback: find try-it-out in the currently open block
    await page.evaluate(() => {
      const tryBtn = document.querySelector('.opblock.is-open .try-out__btn')
      if (tryBtn) tryBtn.click()
    })
    await page.waitForTimeout(500)
  }

  // Fill in the request body
  console.log('\n=== Filling request body ===')
  const requestBody = JSON.stringify({
    name: "Speccon",
    description: "Speccon",
    currencySymbol: "R",
    financialYearStartMonth: "March"
  }, null, 2)

  // Find the textarea in the open block and fill it
  const textarea = page.locator('.opblock.is-open textarea.body-param__text').first()
  if (await textarea.isVisible()) {
    await textarea.fill(requestBody)
    console.log('Request body filled')
  } else {
    console.log('Textarea not found - trying alternative')
    await page.evaluate((body) => {
      const ta = document.querySelector('.opblock.is-open textarea')
      if (ta) {
        ta.value = body
        ta.dispatchEvent(new Event('input', { bubbles: true }))
      }
    }, requestBody)
  }

  await page.screenshot({ path: 'tests/swagger-05-body-filled.png', fullPage: false })

  // Click Execute
  console.log('\n=== Executing API call ===')
  const executeBtn = page.locator('.opblock.is-open button.execute').first()
  if (await executeBtn.isVisible()) {
    await executeBtn.click()
    console.log('Clicked Execute')
  } else {
    await page.evaluate(() => {
      const btn = document.querySelector('.opblock.is-open .execute')
      if (btn) btn.click()
    })
  }

  // Wait for response
  await page.waitForTimeout(5000)
  await page.screenshot({ path: 'tests/swagger-06-response.png', fullPage: false })

  // Extract the response
  console.log('\n=== Extracting Response ===')
  const responseData = await page.evaluate(() => {
    const responseCodes = document.querySelectorAll('.opblock.is-open .responses-table .response .response-col_status')
    const responseBodies = document.querySelectorAll('.opblock.is-open .responses-table .response .response-col_description pre')
    const liveResponse = document.querySelector('.opblock.is-open .live-responses-table .response-col_status')
    const liveBody = document.querySelector('.opblock.is-open .live-responses-table pre.microlight')

    // Also try to get the curl command
    const curlBlock = document.querySelector('.opblock.is-open .curl-command pre')

    return {
      statusCode: liveResponse?.textContent?.trim() || 'not found',
      responseBody: liveBody?.textContent?.trim() || 'not found',
      curl: curlBlock?.textContent?.trim() || 'not found'
    }
  })

  console.log('\nStatus Code:', responseData.statusCode)
  console.log('Response Body:', responseData.responseBody)
  console.log('Curl Command:', responseData.curl)

  // Final screenshot
  await page.screenshot({ path: 'tests/swagger-07-final.png', fullPage: true })
  console.log('\n=== Done - Screenshots saved in tests/ ===')

  // Keep browser open for 10 seconds so user can see, then close
  await page.waitForTimeout(10000)
  await browser.close()
})()
