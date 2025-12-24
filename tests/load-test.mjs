/**
 * Нагрузочное тестирование (Node.js ESM)
 * Запуск: node tests/load-test.mjs
 * С URL: TEST_URL=https://www.basecraft.ru node tests/load-test.mjs
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const TIMEOUT = 10000;

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
  
  try {
    const start = Date.now();
    const response = await fetch(url, { ...options, signal: controller.signal });
    const responseTime = Date.now() - start;
    clearTimeout(timeoutId);
    return { ok: response.ok, status: response.status, responseTime };
  } catch (error) {
    clearTimeout(timeoutId);
    return { ok: false, status: 0, responseTime: Date.now(), error: error.message };
  }
}

async function runLoadTest(name, url, concurrency, durationMs) {
  console.log(`\n🔥 ${name}`);
  console.log(`   URL: ${url}`);
  console.log(`   Параллельность: ${concurrency}`);
  console.log(`   Длительность: ${durationMs / 1000}s`);
  
  const results = [];
  const endTime = Date.now() + durationMs;
  
  const worker = async () => {
    while (Date.now() < endTime) {
      const result = await fetchWithTimeout(url);
      results.push(result);
    }
  };
  
  const workers = Array.from({ length: concurrency }, worker);
  await Promise.all(workers);
  
  // Статистика
  const successful = results.filter(r => r.ok);
  const failed = results.filter(r => !r.ok);
  const times = successful.map(r => r.responseTime);
  
  const avgTime = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  const minTime = times.length ? Math.min(...times) : 0;
  const maxTime = times.length ? Math.max(...times) : 0;
  const rps = results.length / (durationMs / 1000);
  
  // Percentiles
  times.sort((a, b) => a - b);
  const p50 = times[Math.floor(times.length * 0.5)] || 0;
  const p95 = times[Math.floor(times.length * 0.95)] || 0;
  const p99 = times[Math.floor(times.length * 0.99)] || 0;
  
  console.log(`\n   📊 Результаты:`);
  console.log(`   ├─ Запросов: ${results.length}`);
  console.log(`   ├─ Успешных: ${successful.length} (${(successful.length / results.length * 100).toFixed(1)}%)`);
  console.log(`   ├─ Ошибок: ${failed.length}`);
  console.log(`   ├─ RPS: ${rps.toFixed(2)}`);
  console.log(`   ├─ Avg: ${avgTime.toFixed(0)}ms`);
  console.log(`   ├─ Min: ${minTime}ms`);
  console.log(`   ├─ Max: ${maxTime}ms`);
  console.log(`   ├─ P50: ${p50}ms`);
  console.log(`   ├─ P95: ${p95}ms`);
  console.log(`   └─ P99: ${p99}ms`);
  
  return { name, total: results.length, successful: successful.length, failed: failed.length, rps, avgTime, p95, p99 };
}

async function main() {
  console.log('\n' + '🚀'.repeat(25));
  console.log('   НАГРУЗОЧНОЕ ТЕСТИРОВАНИЕ');
  console.log('🚀'.repeat(25));
  console.log(`\n📍 Сервер: ${BASE_URL}`);
  console.log(`📅 ${new Date().toISOString()}`);
  
  // Проверка доступности
  console.log('\n⏳ Проверка сервера...');
  const check = await fetchWithTimeout(`${BASE_URL}/api/health`);
  if (!check.ok) {
    console.log(`❌ Сервер недоступен`);
    process.exit(1);
  }
  console.log(`✅ Сервер доступен (${check.responseTime}ms)`);
  
  const results = [];
  
  // Тест 1: Легкая нагрузка
  results.push(await runLoadTest(
    'Health Check - Легкая нагрузка',
    `${BASE_URL}/api/health`,
    5,   // concurrency
    5000 // 5 секунд
  ));
  
  // Тест 2: Средняя нагрузка
  results.push(await runLoadTest(
    'Health Check - Средняя нагрузка',
    `${BASE_URL}/api/health`,
    20,
    10000
  ));
  
  // Тест 3: Models endpoint
  results.push(await runLoadTest(
    'Models List - Средняя нагрузка',
    `${BASE_URL}/api/models/list`,
    10,
    5000
  ));
  
  // Сводка
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 СВОДКА НАГРУЗОЧНОГО ТЕСТИРОВАНИЯ');
  console.log('='.repeat(60));
  console.log('\n| Тест | RPS | Avg | P95 | P99 | Ошибки |');
  console.log('|------|-----|-----|-----|-----|--------|');
  
  results.forEach(r => {
    const errorRate = r.failed > 0 ? `${r.failed}` : '0';
    console.log(`| ${r.name.slice(0, 25).padEnd(25)} | ${r.rps.toFixed(1).padStart(4)} | ${r.avgTime.toFixed(0).padStart(4)}ms | ${r.p95.toString().padStart(4)}ms | ${r.p99.toString().padStart(4)}ms | ${errorRate.padStart(6)} |`);
  });
  
  console.log('\n');
  
  // Рекомендации
  const hasErrors = results.some(r => r.failed > 0);
  const slowEndpoints = results.filter(r => r.p95 > 500);
  const lowRps = results.filter(r => r.rps < 10);
  
  console.log('💡 РЕКОМЕНДАЦИИ:\n');
  
  if (hasErrors) {
    console.log('⚠️  Есть ошибки при нагрузке - проверьте логи сервера');
  }
  if (slowEndpoints.length > 0) {
    console.log('⚠️  P95 > 500ms - возможны проблемы с производительностью');
  }
  if (lowRps.length > 0) {
    console.log('⚠️  RPS < 10 - низкая пропускная способность');
  }
  if (!hasErrors && slowEndpoints.length === 0) {
    console.log('✅ Сервер стабилен под нагрузкой');
  }
  
  console.log('\n');
}

main().catch(console.error);



