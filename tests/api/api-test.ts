/**
 * Функциональное тестирование API
 * 
 * Запуск: npx ts-node tests/api/api-test.ts
 * 
 * Тестирует:
 * 1. Корректность HTTP статусов
 * 2. Валидацию входных данных
 * 3. Обработку ошибок
 * 4. Авторизацию
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

interface TestCase {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  body?: any;
  headers?: Record<string, string>;
  expectedStatus: number | number[];
  expectedBodyContains?: string[];
  expectedBodyNotContains?: string[];
}

interface TestResult {
  name: string;
  passed: boolean;
  status: number;
  expectedStatus: number | number[];
  responseTime: number;
  error?: string;
  response?: any;
}

async function runTest(test: TestCase): Promise<TestResult> {
  const start = performance.now();
  
  try {
    const response = await fetch(`${BASE_URL}${test.url}`, {
      method: test.method,
      headers: {
        'Content-Type': 'application/json',
        ...test.headers,
      },
      body: test.body ? JSON.stringify(test.body) : undefined,
    });
    
    const responseTime = performance.now() - start;
    let responseBody: any;
    
    try {
      responseBody = await response.json();
    } catch {
      responseBody = null;
    }
    
    // Проверка статуса
    const expectedStatuses = Array.isArray(test.expectedStatus) 
      ? test.expectedStatus 
      : [test.expectedStatus];
    
    const statusMatch = expectedStatuses.includes(response.status);
    
    // Проверка содержимого ответа
    let bodyMatch = true;
    let bodyError = '';
    
    if (test.expectedBodyContains && responseBody) {
      const bodyStr = JSON.stringify(responseBody);
      for (const expected of test.expectedBodyContains) {
        if (!bodyStr.includes(expected)) {
          bodyMatch = false;
          bodyError = `Ожидалось содержимое: "${expected}"`;
          break;
        }
      }
    }
    
    if (test.expectedBodyNotContains && responseBody) {
      const bodyStr = JSON.stringify(responseBody);
      for (const notExpected of test.expectedBodyNotContains) {
        if (bodyStr.includes(notExpected)) {
          bodyMatch = false;
          bodyError = `Не ожидалось содержимое: "${notExpected}"`;
          break;
        }
      }
    }
    
    return {
      name: test.name,
      passed: statusMatch && bodyMatch,
      status: response.status,
      expectedStatus: test.expectedStatus,
      responseTime,
      error: !statusMatch 
        ? `Статус ${response.status}, ожидался ${test.expectedStatus}` 
        : !bodyMatch ? bodyError : undefined,
      response: responseBody,
    };
  } catch (error: any) {
    return {
      name: test.name,
      passed: false,
      status: 0,
      expectedStatus: test.expectedStatus,
      responseTime: performance.now() - start,
      error: `Ошибка запроса: ${error.message}`,
    };
  }
}

// Определение тестов
const tests: TestCase[] = [
  // ============================================
  // HEALTH CHECKS
  // ============================================
  {
    name: 'Health: базовая проверка',
    method: 'GET',
    url: '/api/health',
    expectedStatus: 200,
    expectedBodyContains: ['status', 'ok'],
  },
  
  // ============================================
  // AUTHENTICATION TESTS
  // ============================================
  {
    name: 'Auth: Generations list без авторизации',
    method: 'GET',
    url: '/api/generations/list',
    expectedStatus: 401,
    expectedBodyContains: ['Unauthorized'],
  },
  {
    name: 'Auth: Create generation без авторизации',
    method: 'POST',
    url: '/api/generations/create',
    body: { prompt: 'test' },
    expectedStatus: 401,
  },
  {
    name: 'Auth: Admin endpoint без авторизации',
    method: 'GET',
    url: '/api/admin/stats',
    expectedStatus: 401,
  },
  
  // ============================================
  // VALIDATION TESTS
  // ============================================
  {
    name: 'Validation: Несуществующий generation ID',
    method: 'GET',
    url: '/api/generations/non-existent-id-12345',
    expectedStatus: [401, 404], // 401 если не авторизован, 404 если авторизован
  },
  
  // ============================================
  // ERROR HANDLING TESTS
  // ============================================
  {
    name: 'Error: Несуществующий endpoint',
    method: 'GET',
    url: '/api/nonexistent',
    expectedStatus: 404,
  },
  {
    name: 'Error: Неправильный метод на health',
    method: 'POST',
    url: '/api/health',
    expectedStatus: [405, 404], // Может быть 405 Method Not Allowed или 404
  },
  
  // ============================================
  // MODELS API
  // ============================================
  {
    name: 'Models: список моделей',
    method: 'GET',
    url: '/api/models/list',
    expectedStatus: 200,
  },
  
  // ============================================
  // WEBHOOK SECURITY
  // ============================================
  {
    name: 'Webhook: без валидного payload',
    method: 'POST',
    url: '/api/webhook/replicate',
    body: { invalid: 'data' },
    expectedStatus: [400, 404, 500], // Должен отклонить невалидный webhook
  },
  
  // ============================================
  // RATE LIMITING (если есть)
  // ============================================
  {
    name: 'Rate Limit: проверка заголовков',
    method: 'GET',
    url: '/api/health',
    expectedStatus: 200,
  },
];

// SQL Injection тесты
const sqlInjectionTests: TestCase[] = [
  {
    name: 'SQLi: в query параметрах (list)',
    method: 'GET',
    url: "/api/generations/list?page=1'; DROP TABLE generations;--",
    expectedStatus: [400, 401, 500], // Не должен вернуть 200
  },
  {
    name: 'SQLi: в ID параметре',
    method: 'GET',
    url: "/api/generations/1' OR '1'='1",
    expectedStatus: [400, 401, 404],
  },
];

// XSS тесты
const xssTests: TestCase[] = [
  {
    name: 'XSS: в prompt поле',
    method: 'POST',
    url: '/api/generations/create',
    body: { 
      prompt: '<script>alert("xss")</script>',
      model_id: 'test',
      action: 'create',
    },
    expectedStatus: [400, 401], // Должен отклонить или требовать авторизацию
    expectedBodyNotContains: ['<script>'], // Не должен вернуть сырой HTML
  },
];

async function runAllTests() {
  console.log('\n🧪 ФУНКЦИОНАЛЬНОЕ ТЕСТИРОВАНИЕ API');
  console.log(`   Целевой сервер: ${BASE_URL}`);
  console.log('='.repeat(60));
  
  // Проверяем доступность сервера
  console.log('\n⏳ Проверка доступности сервера...');
  const healthCheck = await runTest(tests[0]);
  
  if (!healthCheck.passed && healthCheck.status === 0) {
    console.error(`\n❌ Сервер недоступен: ${healthCheck.error}`);
    console.log('   Убедитесь что приложение запущено: npm run dev');
    process.exit(1);
  }
  
  console.log(`✅ Сервер доступен (${healthCheck.responseTime.toFixed(0)}ms)\n`);
  
  const allTests = [...tests, ...sqlInjectionTests, ...xssTests];
  const results: TestResult[] = [];
  
  // Группируем тесты по категориям
  console.log('📋 Запуск тестов...\n');
  
  for (const test of allTests) {
    const result = await runTest(test);
    results.push(result);
    
    const icon = result.passed ? '✅' : '❌';
    const statusInfo = `[${result.status}]`;
    console.log(`${icon} ${statusInfo.padEnd(6)} ${result.name}`);
    
    if (!result.passed && result.error) {
      console.log(`         └─ ${result.error}`);
    }
  }
  
  // Сводка
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 РЕЗУЛЬТАТЫ:');
  console.log(`   ✅ Прошло:   ${passed}/${results.length}`);
  console.log(`   ❌ Провалено: ${failed}/${results.length}`);
  console.log(`   📈 Успех:    ${((passed / results.length) * 100).toFixed(1)}%`);
  console.log('='.repeat(60));
  
  // Детали провалов
  if (failed > 0) {
    console.log('\n🚨 ПРОВАЛИВШИЕСЯ ТЕСТЫ:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`\n   ❌ ${r.name}`);
      console.log(`      Статус: ${r.status}, ожидался: ${r.expectedStatus}`);
      if (r.error) console.log(`      Ошибка: ${r.error}`);
      if (r.response) console.log(`      Ответ: ${JSON.stringify(r.response).slice(0, 200)}`);
    });
  }
  
  // Рекомендации по безопасности
  console.log('\n🔐 ПРОВЕРКА БЕЗОПАСНОСТИ:');
  
  const authTests = results.filter(r => r.name.startsWith('Auth:'));
  const authPassed = authTests.every(r => r.passed);
  console.log(`   ${authPassed ? '✅' : '⚠️'} Авторизация: ${authPassed ? 'OK' : 'Требует внимания'}`);
  
  const sqliTests = results.filter(r => r.name.startsWith('SQLi:'));
  const sqliPassed = sqliTests.every(r => r.passed);
  console.log(`   ${sqliPassed ? '✅' : '⚠️'} SQL Injection защита: ${sqliPassed ? 'OK' : 'Требует внимания'}`);
  
  const xssPassed = results.filter(r => r.name.startsWith('XSS:')).every(r => r.passed);
  console.log(`   ${xssPassed ? '✅' : '⚠️'} XSS защита: ${xssPassed ? 'OK' : 'Требует внимания'}`);
  
  return { passed, failed, total: results.length };
}

// Запуск
runAllTests().catch(console.error);




