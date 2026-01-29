import { chromium } from 'playwright'

const SWAGGER_URL = 'https://crm-service.speccon.co.za/swagger/index.html'
const LOGIN_EMAIL = 'xander2@speccon.co.za'
const LOGIN_PASSWORD = 'Tap@Test532'

;(async () => {
  // Step 1: Login to get JWT
  console.log('=== Step 1: Login to get JWT ===')
  const loginRes = await fetch('https://crm-service.speccon.co.za/api/User/Login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: LOGIN_EMAIL, password: LOGIN_PASSWORD })
  })
  const loginData = await loginRes.json()
  if (loginData.isError) {
    console.error('Login failed:', loginData.errorMessage)
    process.exit(1)
  }
  const TOKEN = loginData.result.token
  console.log('Got JWT token (first 50 chars):', TOKEN.substring(0, 50) + '...')
  console.log('Token valid until:', loginData.result.validTo)

  // Step 2: Open Swagger UI with Playwright
  console.log('\n=== Step 2: Opening Swagger UI ===')
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()

  await page.goto(SWAGGER_URL, { waitUntil: 'networkidle', timeout: 30000 })
  console.log('Page loaded:', await page.title())

  // Step 3: Authorize with Bearer token
  console.log('\n=== Step 3: Authorizing ===')
  const authorizeBtn = page.locator('button.btn.authorize')
  if (await authorizeBtn.isVisible()) {
    await authorizeBtn.click()
    await page.waitForTimeout(1000)

    const tokenInput = page.locator('.auth-container input[type="text"]').first()
    if (await tokenInput.isVisible()) {
      await tokenInput.fill('Bearer ' + TOKEN)
      console.log('Token entered')

      // Click Authorize button in modal
      const authButtons = page.locator('.auth-btn-wrapper button')
      const count = await authButtons.count()
      for (let i = 0; i < count; i++) {
        const text = await authButtons.nth(i).textContent()
        if (text.trim().toLowerCase() === 'authorize') {
          await authButtons.nth(i).click()
          console.log('Clicked Authorize')
          break
        }
      }
      await page.waitForTimeout(1000)

      // Close modal
      for (let i = 0; i < count; i++) {
        const text = await authButtons.nth(i).textContent()
        if (text.trim().toLowerCase() === 'close') {
          await authButtons.nth(i).click()
          break
        }
      }
      await page.waitForTimeout(500)
    }
  }

  await page.screenshot({ path: 'tests/api-test-01-authorized.png' })

  // Step 4: Try CreateTenant via Swagger UI
  console.log('\n=== Step 4: Testing CreateTenant ===')

  // Expand Tenant section
  await page.evaluate(() => {
    const sections = document.querySelectorAll('.opblock-tag-section h3')
    for (const s of sections) {
      if (s.textContent.includes('Tenant')) {
        s.click()
        s.scrollIntoView()
        break
      }
    }
  })
  await page.waitForTimeout(1000)

  // Find and click CreateTenant
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

  // Click Try it out
  await page.evaluate(() => {
    const tryBtn = document.querySelector('.opblock.is-open .try-out__btn')
    if (tryBtn) tryBtn.click()
  })
  await page.waitForTimeout(500)

  // Fill request body
  const tenantBody = JSON.stringify({
    name: "Demo Tenant",
    description: "Demo Tenant for testing",
    currencySymbol: "R",
    financialYearStartMonth: "March"
  }, null, 2)

  const textarea = page.locator('.opblock.is-open textarea.body-param__text').first()
  if (await textarea.isVisible()) {
    await textarea.fill(tenantBody)
    console.log('Tenant body filled')
  } else {
    await page.evaluate((body) => {
      const ta = document.querySelector('.opblock.is-open textarea')
      if (ta) {
        ta.value = body
        ta.dispatchEvent(new Event('input', { bubbles: true }))
      }
    }, tenantBody)
  }

  // Click Execute
  await page.evaluate(() => {
    const btn = document.querySelector('.opblock.is-open .execute')
    if (btn) btn.click()
  })
  await page.waitForTimeout(5000)

  // Extract response
  const tenantResponse = await page.evaluate(() => {
    const statusEl = document.querySelector('.opblock.is-open .live-responses-table .response-col_status')
    const bodyEl = document.querySelector('.opblock.is-open .live-responses-table pre.microlight')
    const curlEl = document.querySelector('.opblock.is-open .curl-command pre')
    // Also check for any highlight or error detail
    const responseHeaders = document.querySelector('.opblock.is-open .live-responses-table .response-col_description pre')
    return {
      status: statusEl?.textContent?.trim() || 'no status',
      body: bodyEl?.textContent?.trim() || 'no body',
      curl: curlEl?.textContent?.trim() || 'no curl',
      headers: responseHeaders?.textContent?.trim() || 'no headers'
    }
  })

  console.log('\nCreateTenant Response:')
  console.log('Status:', tenantResponse.status)
  console.log('Body:', tenantResponse.body)
  console.log('Curl:', tenantResponse.curl)
  console.log('Headers:', tenantResponse.headers)

  await page.screenshot({ path: 'tests/api-test-02-tenant-response.png', fullPage: true })

  // Step 5: Also test via direct fetch with detailed error capture
  console.log('\n=== Step 5: Direct API calls ===')

  // Try CreateTenant directly
  console.log('\n--- CreateTenant ---')
  try {
    const res = await fetch('https://crm-service.speccon.co.za/api/Tenant/CreateTenant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + TOKEN
      },
      body: JSON.stringify({
        name: "Demo Tenant",
        description: "Demo Tenant for testing",
        currencySymbol: "R",
        financialYearStartMonth: "March"
      })
    })
    console.log('HTTP Status:', res.status)
    console.log('Response Headers:')
    for (const [key, value] of res.headers) {
      console.log(`  ${key}: ${value}`)
    }
    const text = await res.text()
    console.log('Body:', text)
  } catch (err) {
    console.error('Fetch error:', err)
  }

  // Try CreateUser directly
  console.log('\n--- CreateUser ---')
  try {
    const res = await fetch('https://crm-service.speccon.co.za/api/User/CreateUser', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + TOKEN
      },
      body: JSON.stringify({
        email: "hein@trouidees.co.za",
        firstName: "Hein",
        lastName: "Trouidees",
        password: "Speccon@123",
        tenantId: 3,
        roleId: 1
      })
    })
    console.log('HTTP Status:', res.status)
    console.log('Response Headers:')
    for (const [key, value] of res.headers) {
      console.log(`  ${key}: ${value}`)
    }
    const text = await res.text()
    console.log('Body:', text)
  } catch (err) {
    console.error('Fetch error:', err)
  }

  console.log('\n=== Done ===')
  console.log('Screenshots saved in tests/')

  // Keep browser open for review
  await page.waitForTimeout(15000)
  await browser.close()
})()
