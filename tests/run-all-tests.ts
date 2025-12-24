#!/usr/bin/env npx ts-node
/**
 * Мастер-скрипт для запуска всех тестов
 * 
 * Запуск: npx ts-node tests/run-all-tests.ts
 * 
 * Или отдельные тесты:
 *   npx ts-node tests/load/load-test.ts     - нагрузочные
 *   npx ts-node tests/api/api-test.ts       - API тесты
 *   npx playwright test tests/e2e/          - E2E тесты
 */

import { execSync, spawn } from 'child_process';
import * as path from 'path';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

interface TestSuite {
  name: string;
  description: string;
  command: string;
  timeout: number;
}

const testSuites: TestSuite[] = [
  {
    name: 'API Tests',
    description: 'Функциональные тесты API endpoints',
    command: 'npx ts-node tests/api/api-test.ts',
    timeout: 60000,
  },
  {
    name: 'Load Tests',
    description: 'Нагрузочное тестирование',
    command: 'npx ts-node tests/load/load-test.ts',
    timeout: 120000,
  },
];

async function checkServerAvailability(): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    return response.ok;
  } catch {
    return false;
  }
}

async function runTestSuite(suite: TestSuite): Promise<{ success: boolean; output: string }> {
  return new Promise((resolve) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 ${suite.name}`);
    console.log(`   ${suite.description}`);
    console.log(`${'='.repeat(60)}\n`);

    try {
      const output = execSync(suite.command, {
        cwd: process.cwd(),
        timeout: suite.timeout,
        encoding: 'utf-8',
        stdio: 'inherit',
        env: { ...process.env, TEST_URL: BASE_URL },
      });
      resolve({ success: true, output: output || '' });
    } catch (error: any) {
      resolve({ success: false, output: error.message });
    }
  });
}

async function main() {
  console.log('\n' + '🚀'.repeat(30));
  console.log('     ПОЛНОЕ ТЕСТИРОВАНИЕ .BASE');
  console.log('🚀'.repeat(30));
  console.log(`\n📍 Целевой сервер: ${BASE_URL}`);
  console.log(`📅 Дата: ${new Date().toISOString()}\n`);

  // Проверка доступности сервера
  console.log('⏳ Проверка доступности сервера...');
  const serverAvailable = await checkServerAvailability();

  if (!serverAvailable) {
    console.error('\n❌ Сервер недоступен!');
    console.log('   Запустите приложение командой: npm run dev');
    console.log('   Или укажите другой URL: TEST_URL=https://... npx ts-node tests/run-all-tests.ts\n');
    process.exit(1);
  }

  console.log('✅ Сервер доступен\n');

  // Запуск тестов
  const results: { name: string; success: boolean }[] = [];

  for (const suite of testSuites) {
    const result = await runTestSuite(suite);
    results.push({ name: suite.name, success: result.success });
  }

  // Итоговый отчёт
  console.log('\n\n' + '📊'.repeat(30));
  console.log('           ИТОГОВЫЙ ОТЧЁТ');
  console.log('📊'.repeat(30));
  console.log('\n');

  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  results.forEach((r) => {
    const icon = r.success ? '✅' : '❌';
    console.log(`   ${icon} ${r.name}`);
  });

  console.log('\n' + '-'.repeat(40));
  console.log(`   Пройдено: ${passed}/${results.length}`);
  console.log(`   Провалено: ${failed}/${results.length}`);
  console.log('-'.repeat(40));

  // Рекомендации
  console.log('\n💡 ДОПОЛНИТЕЛЬНЫЕ ТЕСТЫ:');
  console.log('   • SQL анализ: скопируйте tests/sql/analyze-queries.sql в Supabase SQL Editor');
  console.log('   • E2E тесты: npm install -D @playwright/test && npx playwright test tests/e2e/');
  console.log('   • Security: npm audit');
  console.log('');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);



