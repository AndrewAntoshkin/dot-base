/**
 * Быстрый тест API (Node.js ESM) с таймаутами
 * Запуск: node tests/quick-test.mjs
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const TIMEOUT = 5000; // 5 секунд таймаут

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
  
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
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

async function runTests() {
  console.log('\n🧪 БЫСТРОЕ ТЕСТИРОВАНИЕ API');
  console.log(`📍 Сервер: ${BASE_URL}`);
  console.log(`⏱️  Таймаут: ${TIMEOUT}ms`);
  console.log('='.repeat(50) + '\n');

  // Проверка доступности сервера
  console.log('⏳ Проверка сервера...');
  try {
    const healthRes = await fetchWithTimeout(`${BASE_URL}/api/health`);
    if (!healthRes.ok) {
      console.log(`\n❌ Сервер вернул статус ${healthRes.status}`);
      process.exit(1);
    }
    console.log('✅ Сервер доступен\n');
  } catch (error) {
    console.log(`\n❌ Сервер недоступен: ${error.message}`);
    console.log('   Убедитесь что запущен: npm run dev');
    console.log('   Или укажите другой URL: TEST_URL=https://... node tests/quick-test.mjs\n');
    process.exit(1);
  }

  let passed = 0;
  let failed = 0;

  // 1. Health check
  if (await test('Health endpoint', async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/api/health`);
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    const data = await res.json();
    if (data.status !== 'ok') throw new Error('Status not ok');
  })) passed++; else failed++;

  // 2. Auth protection - generations list
  if (await test('Auth: /api/generations/list требует авторизации', async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/api/generations/list`);
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  })) passed++; else failed++;

  // 3. Auth protection - generations create
  if (await test('Auth: /api/generations/create требует авторизации', async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/api/generations/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'test' }),
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  })) passed++; else failed++;

  // 4. Auth protection - admin (401 или 403 - оба валидны)
  if (await test('Auth: /api/admin/stats требует авторизации', async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/api/admin/stats`);
    if (res.status !== 401 && res.status !== 403) throw new Error(`Expected 401/403, got ${res.status}`);
  })) passed++; else failed++;

  // 5. Models list (public)
  if (await test('Models list доступен', async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/api/models/list`);
    if (!res.ok) throw new Error(`Status: ${res.status}`);
  })) passed++; else failed++;

  // 6. Non-existent endpoint
  if (await test('404 для несуществующего endpoint', async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/api/nonexistent12345`);
    if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
  })) passed++; else failed++;

  // 7. SQL Injection test
  if (await test('SQL Injection защита', async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/api/generations/list?page=1'; DROP TABLE generations;--`);
    if (res.status === 200) throw new Error('Endpoint вернул 200 на SQL injection');
  })) passed++; else failed++;

  // 8. Performance - health response time
  if (await test('Health отвечает < 500ms', async () => {
    const start = Date.now();
    await fetchWithTimeout(`${BASE_URL}/api/health`);
    const time = Date.now() - start;
    if (time > 500) throw new Error(`Response time: ${time}ms`);
  })) passed++; else failed++;

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`📊 РЕЗУЛЬТАТЫ: ${passed}/${passed + failed} тестов пройдено`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log('='.repeat(50) + '\n');

  // Нагрузочный мини-тест
  console.log('🔥 МИНИ-НАГРУЗОЧНЫЙ ТЕСТ (10 параллельных запросов)');
  
  const loadStart = Date.now();
  const promises = Array.from({ length: 10 }, () => 
    fetchWithTimeout(`${BASE_URL}/api/health`).then(r => ({ ok: r.ok, time: Date.now() })).catch(() => ({ ok: false }))
  );
  
  const results = await Promise.all(promises);
  const loadTime = Date.now() - loadStart;
  const successCount = results.filter(r => r.ok).length;
  
  console.log(`   Время: ${loadTime}ms`);
  console.log(`   Успешных: ${successCount}/10`);
  console.log(`   RPS: ~${Math.round(10000 / loadTime)} req/sec\n`);

  return failed === 0;
}

runTests()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });




