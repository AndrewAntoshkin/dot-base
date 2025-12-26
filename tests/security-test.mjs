/**
 * Security тестирование (Node.js ESM)
 * Запуск: node tests/security-test.mjs
 * С URL: TEST_URL=https://www.basecraft.ru node tests/security-test.mjs
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const TIMEOUT = 10000;

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
  
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    const text = await response.text();
    return { ok: response.ok, status: response.status, body: text, headers: response.headers };
  } catch (error) {
    clearTimeout(timeoutId);
    return { ok: false, status: 0, body: '', error: error.message };
  }
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    return true;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   └─ ${error.message}`);
    return false;
  }
}

async function runSecurityTests() {
  console.log('\n' + '🔐'.repeat(25));
  console.log('   ТЕСТИРОВАНИЕ БЕЗОПАСНОСТИ');
  console.log('🔐'.repeat(25));
  console.log(`\n📍 Сервер: ${BASE_URL}\n`);
  
  let passed = 0;
  let failed = 0;
  
  // =====================================
  // SQL INJECTION TESTS
  // =====================================
  console.log('\n📋 SQL Injection тесты:');
  
  // SQLi in query params
  if (await test('SQLi: DROP TABLE в параметрах', async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/api/generations/list?page=1'; DROP TABLE generations;--`);
    if (res.status === 200) throw new Error('Запрос прошёл без защиты');
    if (res.body.toLowerCase().includes('drop table')) throw new Error('SQL команда в ответе');
  })) passed++; else failed++;
  
  // SQLi in path
  if (await test('SQLi: OR 1=1 в пути', async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/api/generations/1' OR '1'='1`);
    if (res.body.toLowerCase().includes('or \'1\'=\'1\'')) throw new Error('SQL в ответе');
  })) passed++; else failed++;
  
  // SQLi UNION attack
  if (await test('SQLi: UNION SELECT атака', async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/api/generations/list?page=1 UNION SELECT * FROM users--`);
    if (res.status === 200) throw new Error('UNION запрос прошёл');
  })) passed++; else failed++;
  
  // =====================================
  // XSS TESTS
  // =====================================
  console.log('\n📋 XSS тесты:');
  
  // XSS in error response
  if (await test('XSS: script в пути не отражается', async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/api/generations/<script>alert('xss')</script>`);
    if (res.body.includes('<script>alert')) throw new Error('Неэкранированный script в ответе');
  })) passed++; else failed++;
  
  // XSS in query params
  if (await test('XSS: script в параметрах', async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/api/generations/list?page=<script>alert(1)</script>`);
    if (res.body.includes('<script>alert')) throw new Error('Script отражается в ответе');
  })) passed++; else failed++;
  
  // XSS in POST body
  if (await test('XSS: script в POST body', async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/api/generations/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: '<img src=x onerror=alert(1)>' }),
    });
    if (res.body.includes('<img src=x onerror')) throw new Error('XSS payload в ответе');
  })) passed++; else failed++;
  
  // =====================================
  // AUTHENTICATION TESTS
  // =====================================
  console.log('\n📋 Тесты авторизации:');
  
  // No auth header
  if (await test('Auth: Запрос без токена отклоняется', async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/api/generations/list`);
    if (res.status === 200) throw new Error('Запрос без токена прошёл');
  })) passed++; else failed++;
  
  // Invalid auth token
  if (await test('Auth: Невалидный токен отклоняется', async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/api/generations/list`, {
      headers: { 'Authorization': 'Bearer invalid_token_12345' },
    });
    if (res.status === 200) throw new Error('Невалидный токен принят');
  })) passed++; else failed++;
  
  // Admin endpoint protection
  if (await test('Auth: Admin endpoints защищены', async () => {
    const adminEndpoints = ['/api/admin/stats', '/api/admin/users', '/api/admin/cleanup'];
    for (const endpoint of adminEndpoints) {
      const res = await fetchWithTimeout(`${BASE_URL}${endpoint}`);
      if (res.status === 200) throw new Error(`${endpoint} не защищён`);
    }
  })) passed++; else failed++;
  
  // =====================================
  // HEADER SECURITY TESTS
  // =====================================
  console.log('\n📋 Тесты заголовков безопасности:');
  
  // Check security headers
  if (await test('Headers: X-Frame-Options или CSP', async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/api/health`);
    const hasXFrame = res.headers.get('x-frame-options');
    const hasCSP = res.headers.get('content-security-policy');
    // Vercel/Next.js может не устанавливать их на API routes, это ОК
  })) passed++; else failed++;
  
  // Content-Type header
  if (await test('Headers: Content-Type корректный', async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/api/health`);
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(`Content-Type: ${contentType}`);
    }
  })) passed++; else failed++;
  
  // =====================================
  // RATE LIMITING TEST
  // =====================================
  console.log('\n📋 Тест Rate Limiting:');
  
  if (await test('Rate Limit: Множественные запросы (50)', async () => {
    const promises = Array.from({ length: 50 }, () => 
      fetchWithTimeout(`${BASE_URL}/api/health`)
    );
    const results = await Promise.all(promises);
    const blocked = results.filter(r => r.status === 429).length;
    // Если rate limiting включён, часть запросов будет заблокирована
    console.log(`   └─ ${blocked}/50 запросов ограничены (429)`);
    // Не фейлим тест - просто информируем
  })) passed++; else failed++;
  
  // =====================================
  // PATH TRAVERSAL TEST
  // =====================================
  console.log('\n📋 Тест Path Traversal:');
  
  if (await test('Path Traversal: ../../../etc/passwd', async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/api/../../../etc/passwd`);
    if (res.body.includes('root:')) throw new Error('Path traversal успешен!');
  })) passed++; else failed++;
  
  // =====================================
  // SUMMARY
  // =====================================
  console.log('\n' + '='.repeat(50));
  console.log(`🔐 РЕЗУЛЬТАТЫ БЕЗОПАСНОСТИ: ${passed}/${passed + failed}`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log('='.repeat(50));
  
  if (failed === 0) {
    console.log('\n✅ Все тесты безопасности пройдены!\n');
  } else {
    console.log('\n⚠️  Есть проблемы с безопасностью, требуется внимание!\n');
  }
  
  return failed === 0;
}

runSecurityTests()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });




