/**
 * Нагрузочное тестирование API
 * 
 * Запуск: npx ts-node tests/load/load-test.ts
 * 
 * Тестирует:
 * 1. Health endpoint - базовая производительность
 * 2. Generations list - нагрузка на БД
 * 3. Concurrent requests - параллельные запросы
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

interface TestResult {
  endpoint: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  errors: string[];
}

interface RequestResult {
  success: boolean;
  responseTime: number;
  status: number;
  error?: string;
}

async function makeRequest(url: string, options: RequestInit = {}): Promise<RequestResult> {
  const start = performance.now();
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    const responseTime = performance.now() - start;
    
    return {
      success: response.ok,
      responseTime,
      status: response.status,
      error: response.ok ? undefined : `HTTP ${response.status}`,
    };
  } catch (error: any) {
    return {
      success: false,
      responseTime: performance.now() - start,
      status: 0,
      error: error.message,
    };
  }
}

async function runLoadTest(
  name: string,
  url: string,
  options: RequestInit = {},
  config: { concurrency: number; duration: number }
): Promise<TestResult> {
  console.log(`\n🔥 Запуск теста: ${name}`);
  console.log(`   URL: ${url}`);
  console.log(`   Параллельность: ${config.concurrency}`);
  console.log(`   Длительность: ${config.duration}s\n`);
  
  const results: RequestResult[] = [];
  const errors: string[] = [];
  const endTime = Date.now() + config.duration * 1000;
  
  // Запускаем параллельные воркеры
  const workers = Array.from({ length: config.concurrency }, async () => {
    while (Date.now() < endTime) {
      const result = await makeRequest(url, options);
      results.push(result);
      
      if (!result.success && result.error) {
        if (!errors.includes(result.error)) {
          errors.push(result.error);
        }
      }
    }
  });
  
  await Promise.all(workers);
  
  // Подсчёт статистики
  const successfulRequests = results.filter(r => r.success).length;
  const failedRequests = results.filter(r => !r.success).length;
  const responseTimes = results.map(r => r.responseTime);
  
  const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  const minResponseTime = Math.min(...responseTimes);
  const maxResponseTime = Math.max(...responseTimes);
  const requestsPerSecond = results.length / config.duration;
  
  return {
    endpoint: name,
    totalRequests: results.length,
    successfulRequests,
    failedRequests,
    avgResponseTime,
    minResponseTime,
    maxResponseTime,
    requestsPerSecond,
    errors,
  };
}

function printResults(result: TestResult) {
  console.log('\n' + '='.repeat(60));
  console.log(`📊 Результаты: ${result.endpoint}`);
  console.log('='.repeat(60));
  console.log(`   Всего запросов:     ${result.totalRequests}`);
  console.log(`   ✅ Успешных:        ${result.successfulRequests}`);
  console.log(`   ❌ Ошибок:          ${result.failedRequests}`);
  console.log(`   📈 RPS:             ${result.requestsPerSecond.toFixed(2)} req/sec`);
  console.log(`   ⏱️  Avg время:       ${result.avgResponseTime.toFixed(2)}ms`);
  console.log(`   ⚡ Min время:       ${result.minResponseTime.toFixed(2)}ms`);
  console.log(`   🐢 Max время:       ${result.maxResponseTime.toFixed(2)}ms`);
  
  if (result.errors.length > 0) {
    console.log(`   🚨 Ошибки:`);
    result.errors.forEach(e => console.log(`      - ${e}`));
  }
  console.log('='.repeat(60));
}

async function runAllTests() {
  console.log('\n🚀 НАГРУЗОЧНОЕ ТЕСТИРОВАНИЕ API');
  console.log(`   Целевой сервер: ${BASE_URL}`);
  console.log('='.repeat(60));
  
  // Проверяем доступность сервера
  console.log('\n⏳ Проверка доступности сервера...');
  const healthCheck = await makeRequest(`${BASE_URL}/api/health`);
  
  if (!healthCheck.success) {
    console.error(`\n❌ Сервер недоступен: ${healthCheck.error}`);
    console.log('   Убедитесь что приложение запущено: npm run dev');
    process.exit(1);
  }
  
  console.log(`✅ Сервер доступен (${healthCheck.responseTime.toFixed(0)}ms)`);
  
  const results: TestResult[] = [];
  
  // Тест 1: Health endpoint (базовая производительность)
  results.push(await runLoadTest(
    'Health Check (базовый)',
    `${BASE_URL}/api/health`,
    {},
    { concurrency: 10, duration: 5 }
  ));
  
  // Тест 2: Health endpoint под высокой нагрузкой
  results.push(await runLoadTest(
    'Health Check (высокая нагрузка)',
    `${BASE_URL}/api/health`,
    {},
    { concurrency: 50, duration: 10 }
  ));
  
  // Тест 3: Models list (статичный endpoint)
  results.push(await runLoadTest(
    'Models List',
    `${BASE_URL}/api/models/list`,
    {},
    { concurrency: 10, duration: 5 }
  ));
  
  // Вывод всех результатов
  console.log('\n\n' + '🏆'.repeat(30));
  console.log('           ИТОГОВЫЕ РЕЗУЛЬТАТЫ');
  console.log('🏆'.repeat(30));
  
  results.forEach(printResults);
  
  // Сводная таблица
  console.log('\n📋 СВОДНАЯ ТАБЛИЦА:');
  console.log('-'.repeat(80));
  console.log('| Endpoint                      | RPS      | Avg (ms) | Errors | Success % |');
  console.log('-'.repeat(80));
  
  results.forEach(r => {
    const successRate = ((r.successfulRequests / r.totalRequests) * 100).toFixed(1);
    console.log(
      `| ${r.endpoint.padEnd(29)} | ${r.requestsPerSecond.toFixed(2).padStart(8)} | ${r.avgResponseTime.toFixed(2).padStart(8)} | ${String(r.failedRequests).padStart(6)} | ${successRate.padStart(9)}% |`
    );
  });
  console.log('-'.repeat(80));
  
  // Рекомендации
  console.log('\n💡 РЕКОМЕНДАЦИИ:');
  
  const slowEndpoints = results.filter(r => r.avgResponseTime > 100);
  if (slowEndpoints.length > 0) {
    console.log('   ⚠️  Медленные endpoints (>100ms):');
    slowEndpoints.forEach(r => console.log(`      - ${r.endpoint}: ${r.avgResponseTime.toFixed(0)}ms`));
  }
  
  const errorEndpoints = results.filter(r => r.failedRequests > 0);
  if (errorEndpoints.length > 0) {
    console.log('   🚨 Endpoints с ошибками:');
    errorEndpoints.forEach(r => console.log(`      - ${r.endpoint}: ${r.failedRequests} ошибок`));
  }
  
  const lowRpsEndpoints = results.filter(r => r.requestsPerSecond < 100);
  if (lowRpsEndpoints.length > 0) {
    console.log('   📉 Низкий RPS (<100):');
    lowRpsEndpoints.forEach(r => console.log(`      - ${r.endpoint}: ${r.requestsPerSecond.toFixed(0)} RPS`));
  }
  
  if (slowEndpoints.length === 0 && errorEndpoints.length === 0) {
    console.log('   ✅ Все тесты прошли успешно!');
  }
}

// Запуск
runAllTests().catch(console.error);

