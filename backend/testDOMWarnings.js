const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // Listen for console events
  page.on('console', msg => {
    if (msg.type() === 'warning' && msg.text().includes('validateDOMNesting')) {
      console.log('❌ DOM Nesting Warning:', msg.text());
    } else if (msg.type() === 'error') {
      console.log('❌ Error:', msg.text());
    } else {
      console.log('ℹ️', msg.text());
    }
  });

  try {
    // First login as super admin
    console.log('📤 Logging in as super admin...');
    await page.goto('http://localhost:3000/login');
    
    // Wait for login form
    await page.waitForSelector('input[type="email"]');
    
    // Fill login form
    await page.type('input[type="email"]', 'superadmin@system.com');
    await page.type('input[type="password"]', '12345678');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForNavigation();
    console.log('✅ Login successful!');
    
    // Navigate to companies page
    console.log('📤 Navigating to companies page...');
    await page.goto('http://localhost:3000/super-admin/companies');
    
    // Wait for page to load
    await page.waitForSelector('h1');
    console.log('✅ Companies page loaded!');
    
    // Click on a company to view Facebook pages
    console.log('📤 Testing Facebook pages modal...');
    await page.waitForSelector('button[aria-label="more"]', { timeout: 5000 });
    await page.click('button[aria-label="more"]');
    
    // Click on "View Facebook Pages" option
    await page.waitForSelector('li:has(svg[data-testid="FacebookIcon"])', { timeout: 5000 });
    await page.click('li:has(svg[data-testid="FacebookIcon"])');
    
    // Wait for modal to open
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    console.log('✅ Facebook pages modal opened!');
    
    // Wait a bit to see if any warnings appear
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('✅ Test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
})();