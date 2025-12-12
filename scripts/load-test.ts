/**
 * Нагрузочное тестирование .base API
 * 
 * Запуск: npx ts-node --project tsconfig.json scripts/load-test.ts
 * Или: npx tsx scripts/load-test.ts
 */

import 'dotenv/config';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3005';

interface TestResult {
  endpoint: string;
  method: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  errorsByType: Record<string, number>;
}

interface ConcurrencyTestResult {
  concurrency: number;
  results: TestResult[];
}

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Выполнить один запрос и измерить время
 */
async function makeRequest(
  endpoint: string,
  options: RequestInit = {},
  timeout = 30000
): Promise<{ success: boolean; responseTime: number; status: number; error?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  const start = performance.now();
  
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    const responseTime = performance.now() - start;
    clearTimeout(timeoutId);
    
    // Ждём тело ответа чтобы измерить полное время
    await response.text();
    
    return {
      success: response.ok,
      responseTime,
      status: response.status,
      error: response.ok ? undefined : `HTTP ${response.status}`,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    const responseTime = performance.now() - start;
    
    let errorType = 'Unknown';
    if (error.name === 'AbortError') {
      errorType = 'Timeout';
    } else if (error.code === 'ECONNREFUSED') {
      errorType = 'ConnectionRefused';
    } else if (error.code === 'ECONNRESET') {
      errorType = 'ConnectionReset';
    } else if (error.message?.includes('fetch failed')) {
      errorType = 'FetchFailed';
    }
    
    return {
      success: false,
      responseTime,
      status: 0,
      error: errorType,
    };
  }
}

/**
 * Рассчитать перцентиль
 */
function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Нагрузочный тест для одного эндпоинта
 */
async function loadTestEndpoint(
  name: string,
  endpoint: string,
  method: string,
  requestCount: number,
  concurrency: number,
  bodyFn?: () => any
): Promise<TestResult> {
  const responseTimes: number[] = [];
  const errors: Record<string, number> = {};
  let successful = 0;
  let failed = 0;
  
  const startTime = performance.now();
  
  // Разбиваем на батчи по concurrency
  const batches = Math.ceil(requestCount / concurrency);
  
  for (let batch = 0; batch < batches; batch++) {
    const batchSize = Math.min(concurrency, requestCount - batch * concurrency);
    const promises: Promise<void>[] = [];
    
    for (let i = 0; i < batchSize; i++) {
      const options: RequestInit = { method };
      if (bodyFn && method !== 'GET') {
        options.body = JSON.stringify(bodyFn());
      }
      
      promises.push(
        makeRequest(endpoint, options).then(result => {
          responseTimes.push(result.responseTime);
          if (result.success) {
            successful++;
          } else {
            failed++;
            errors[result.error || 'Unknown'] = (errors[result.error || 'Unknown'] || 0) + 1;
          }
        })
      );
    }
    
    await Promise.all(promises);
  }
  
  const totalTime = performance.now() - startTime;
  
  return {
    endpoint: name,
    method,
    totalRequests: requestCount,
    successfulRequests: successful,
    failedRequests: failed,
    avgResponseTime: responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0,
    minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
    maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
    p95ResponseTime: percentile(responseTimes, 95),
    p99ResponseTime: percentile(responseTimes, 99),
    requestsPerSecond: (requestCount / totalTime) * 1000,
    errorsByType: errors,
  };
}

/**
 * Вывести результаты теста
 */
function printResults(results: TestResult[]) {
  console.log('\n' + '='.repeat(80));
  log('📊 РЕЗУЛЬТАТЫ НАГРУЗОЧНОГО ТЕСТИРОВАНИЯ', 'cyan');
  console.log('='.repeat(80) + '\n');
  
  for (const r of results) {
    const successRate = ((r.successfulRequests / r.totalRequests) * 100).toFixed(1);
    const statusColor = parseFloat(successRate) >= 99 ? 'green' : 
                       parseFloat(successRate) >= 95 ? 'yellow' : 'red';
    
    log(`\n📍 ${r.endpoint} (${r.method})`, 'blue');
    console.log('-'.repeat(50));
    
    log(`   Всего запросов:    ${r.totalRequests}`, 'reset');
    log(`   Успешных:          ${r.successfulRequests} (${successRate}%)`, statusColor);
    log(`   Неудачных:         ${r.failedRequests}`, r.failedRequests > 0 ? 'red' : 'reset');
    
    console.log('');
    log(`   ⏱️  Время отклика (мс):`, 'magenta');
    log(`       Min:           ${r.minResponseTime.toFixed(2)}`, 'reset');
    log(`       Avg:           ${r.avgResponseTime.toFixed(2)}`, 'reset');
    log(`       P95:           ${r.p95ResponseTime.toFixed(2)}`, r.p95ResponseTime > 500 ? 'yellow' : 'reset');
    log(`       P99:           ${r.p99ResponseTime.toFixed(2)}`, r.p99ResponseTime > 1000 ? 'red' : 'reset');
    log(`       Max:           ${r.maxResponseTime.toFixed(2)}`, r.maxResponseTime > 2000 ? 'red' : 'reset');
    
    console.log('');
    log(`   🚀 Пропускная способность: ${r.requestsPerSecond.toFixed(2)} req/s`, 'cyan');
    
    if (Object.keys(r.errorsByType).length > 0) {
      console.log('');
      log(`   ❌ Ошибки по типам:`, 'red');
      for (const [type, count] of Object.entries(r.errorsByType)) {
        log(`       ${type}: ${count}`, 'red');
      }
    }
  }
}

/**
 * Тест на масштабируемость (увеличение concurrency)
 */
async function scalabilityTest(
  endpoint: string,
  method: string,
  requestsPerLevel: number,
  concurrencyLevels: number[],
  bodyFn?: () => any
): Promise<ConcurrencyTestResult[]> {
  const results: ConcurrencyTestResult[] = [];
  
  for (const concurrency of concurrencyLevels) {
    log(`\n🔄 Тестирование с concurrency=${concurrency}...`, 'yellow');
    
    const testResult = await loadTestEndpoint(
      endpoint,
      endpoint,
      method,
      requestsPerLevel,
      concurrency,
      bodyFn
    );
    
    results.push({
      concurrency,
      results: [testResult],
    });
    
    // Пауза между уровнями для восстановления сервера
    await new Promise(r => setTimeout(r, 2000));
  }
  
  return results;
}

/**
 * Вывести отчёт о масштабируемости
 */
function printScalabilityReport(results: ConcurrencyTestResult[]) {
  console.log('\n' + '='.repeat(80));
  log('📈 ОТЧЁТ О МАСШТАБИРУЕМОСТИ', 'cyan');
  console.log('='.repeat(80) + '\n');
  
  console.log('Concurrency | RPS      | Avg (ms) | P95 (ms) | P99 (ms) | Success%');
  console.log('-'.repeat(70));
  
  for (const { concurrency, results: r } of results) {
    const test = r[0];
    const successRate = ((test.successfulRequests / test.totalRequests) * 100).toFixed(1);
    
    console.log(
      `${String(concurrency).padStart(11)} | ` +
      `${test.requestsPerSecond.toFixed(2).padStart(8)} | ` +
      `${test.avgResponseTime.toFixed(0).padStart(8)} | ` +
      `${test.p95ResponseTime.toFixed(0).padStart(8)} | ` +
      `${test.p99ResponseTime.toFixed(0).padStart(8)} | ` +
      `${successRate.padStart(7)}%`
    );
  }
}

/**
 * Тест polling нагрузки (симуляция множества пользователей)
 */
async function pollingLoadTest(
  usersCount: number,
  durationSeconds: number
) {
  log(`\n🔄 Симуляция polling от ${usersCount} пользователей в течение ${durationSeconds}s...`, 'yellow');
  
  const pollInterval = 10000; // 10 секунд как в приложении
  const totalPolls = Math.ceil((durationSeconds * 1000) / pollInterval) * usersCount;
  
  const responseTimes: number[] = [];
  const errors: Record<string, number> = {};
  let successful = 0;
  let failed = 0;
  
  const startTime = Date.now();
  const endTime = startTime + (durationSeconds * 1000);
  
  const userPromises: Promise<void>[] = [];
  
  for (let user = 0; user < usersCount; user++) {
    userPromises.push((async () => {
      // Разбросанный старт для реалистичности
      await new Promise(r => setTimeout(r, Math.random() * pollInterval));
      
      while (Date.now() < endTime) {
        const result = await makeRequest('/api/generations/list?limit=20');
        responseTimes.push(result.responseTime);
        
        if (result.success) {
          successful++;
        } else {
          failed++;
          errors[result.error || 'Unknown'] = (errors[result.error || 'Unknown'] || 0) + 1;
        }
        
        await new Promise(r => setTimeout(r, pollInterval));
      }
    })());
  }
  
  await Promise.all(userPromises);
  
  const actualDuration = (Date.now() - startTime) / 1000;
  const actualRps = responseTimes.length / actualDuration;
  
  console.log('\n' + '-'.repeat(50));
  log(`📊 Результаты polling теста:`, 'cyan');
  log(`   Пользователей:     ${usersCount}`, 'reset');
  log(`   Длительность:      ${actualDuration.toFixed(1)}s`, 'reset');
  log(`   Всего запросов:    ${responseTimes.length}`, 'reset');
  log(`   Успешных:          ${successful}`, 'green');
  log(`   Неудачных:         ${failed}`, failed > 0 ? 'red' : 'reset');
  log(`   Avg время (мс):    ${(responseTimes.reduce((a,b) => a+b, 0) / responseTimes.length).toFixed(2)}`, 'reset');
  log(`   Polling RPS:       ${actualRps.toFixed(2)} (ожидалось: ${(usersCount / 10).toFixed(2)})`, 'magenta');
  
  if (Object.keys(errors).length > 0) {
    log(`   Ошибки:`, 'red');
    for (const [type, count] of Object.entries(errors)) {
      log(`     ${type}: ${count}`, 'red');
    }
  }
}

/**
 * Тест Database connection pool
 */
async function dbConnectionTest(concurrency: number, requests: number) {
  log(`\n🗄️  Тест подключений к БД (${requests} запросов, concurrency=${concurrency})...`, 'yellow');
  
  // Этот тест проверяет сколько параллельных запросов к БД может обработать сервер
  const result = await loadTestEndpoint(
    'DB Connections (list)',
    '/api/generations/list?limit=5',
    'GET',
    requests,
    concurrency
  );
  
  log(`   Success Rate:      ${((result.successfulRequests / result.totalRequests) * 100).toFixed(1)}%`, 
      result.successfulRequests === result.totalRequests ? 'green' : 'red');
  log(`   Avg Response:      ${result.avgResponseTime.toFixed(2)}ms`, 'reset');
  log(`   P99 Response:      ${result.p99ResponseTime.toFixed(2)}ms`, 'reset');
  log(`   RPS:               ${result.requestsPerSecond.toFixed(2)}`, 'cyan');
}

/**
 * Главная функция
 */
async function main() {
  console.log('\n' + '='.repeat(80));
  log('🚀 .BASE НАГРУЗОЧНОЕ ТЕСТИРОВАНИЕ', 'cyan');
  log(`   Target: ${BASE_URL}`, 'reset');
  log(`   Time: ${new Date().toISOString()}`, 'reset');
  console.log('='.repeat(80));

  // Проверяем доступность сервера
  log('\n⏳ Проверка доступности сервера...', 'yellow');
  const healthCheck = await makeRequest('/api/health', {}, 5000);
  
  if (!healthCheck.success) {
    log(`\n❌ Сервер недоступен: ${healthCheck.error}`, 'red');
    log('   Убедитесь что сервер запущен: npm run dev -- -p 3005', 'yellow');
    process.exit(1);
  }
  
  log(`✅ Сервер доступен (${healthCheck.responseTime.toFixed(0)}ms)`, 'green');

  // ============================================
  // 1. Базовые тесты эндпоинтов
  // ============================================
  log('\n\n📋 ЭТАП 1: Базовые тесты эндпоинтов', 'blue');
  log('   (100 запросов, concurrency=10)', 'reset');
  
  const basicResults: TestResult[] = [];
  
  // Health endpoint
  basicResults.push(await loadTestEndpoint(
    'Health Check',
    '/api/health',
    'GET',
    100,
    10
  ));
  
  // List generations (требует auth, будет 401)
  basicResults.push(await loadTestEndpoint(
    'List Generations',
    '/api/generations/list?limit=10',
    'GET',
    100,
    10
  ));
  
  // Models list
  basicResults.push(await loadTestEndpoint(
    'Models List',
    '/api/models/list',
    'GET',
    100,
    10
  ));
  
  printResults(basicResults);

  // ============================================
  // 2. Тест масштабируемости
  // ============================================
  log('\n\n📋 ЭТАП 2: Тест масштабируемости (Health endpoint)', 'blue');
  
  const scalabilityResults = await scalabilityTest(
    '/api/health',
    'GET',
    50,
    [1, 5, 10, 20, 50, 100]
  );
  
  printScalabilityReport(scalabilityResults);

  // ============================================
  // 3. Тест высокой нагрузки
  // ============================================
  log('\n\n📋 ЭТАП 3: Тест высокой нагрузки', 'blue');
  log('   (500 запросов, concurrency=50)', 'reset');
  
  const highLoadResults: TestResult[] = [];
  
  highLoadResults.push(await loadTestEndpoint(
    'Health (High Load)',
    '/api/health',
    'GET',
    500,
    50
  ));
  
  highLoadResults.push(await loadTestEndpoint(
    'List Generations (High Load)',
    '/api/generations/list?limit=5',
    'GET',
    500,
    50
  ));
  
  printResults(highLoadResults);

  // ============================================
  // 4. Тест подключений к БД
  // ============================================
  log('\n\n📋 ЭТАП 4: Тест DB connection pool', 'blue');
  
  await dbConnectionTest(100, 200);

  // ============================================
  // 5. Симуляция polling
  // ============================================
  log('\n\n📋 ЭТАП 5: Симуляция polling нагрузки', 'blue');
  log('   (10 пользователей, 30 секунд)', 'reset');
  
  await pollingLoadTest(10, 30);

  // ============================================
  // ИТОГОВЫЙ ОТЧЁТ
  // ============================================
  console.log('\n\n' + '='.repeat(80));
  log('📝 ИТОГОВЫЙ АНАЛИЗ И РЕКОМЕНДАЦИИ', 'cyan');
  console.log('='.repeat(80));
  
  const healthHigh = highLoadResults.find(r => r.endpoint.includes('Health'));
  const listHigh = highLoadResults.find(r => r.endpoint.includes('List'));
  
  console.log('\n🔍 ВЫЯВЛЕННЫЕ УЗКИЕ МЕСТА:\n');
  
  // Анализ результатов
  if (healthHigh && healthHigh.p99ResponseTime > 100) {
    log('⚠️  1. Базовый endpoint (health) отвечает медленно под нагрузкой', 'yellow');
    log('      Возможная причина: холодные старты serverless функций', 'reset');
  }
  
  if (listHigh && listHigh.avgResponseTime > 500) {
    log('⚠️  2. List endpoint медленный (>500ms avg)', 'yellow');
    log('      Причина: каждый запрос создаёт новое подключение к Supabase', 'reset');
  }
  
  if (listHigh && listHigh.failedRequests > listHigh.totalRequests * 0.01) {
    log('❌ 3. Высокий процент ошибок на List endpoint', 'red');
    log('      Вероятно: исчерпание connection pool или rate limiting', 'reset');
  }
  
  const avgConcScalability = scalabilityResults
    .filter(r => r.concurrency >= 50)
    .map(r => r.results[0].requestsPerSecond);
  
  if (avgConcScalability.length > 0 && avgConcScalability[0] < 100) {
    log('⚠️  4. Низкая пропускная способность при высокой concurrency', 'yellow');
    log('      Сервер не масштабируется линейно с нагрузкой', 'reset');
  }
  
  console.log('\n' + '='.repeat(80));
  log('✅ Тестирование завершено', 'green');
}

// Запуск
main().catch(console.error);







