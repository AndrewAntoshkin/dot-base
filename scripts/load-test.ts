/**
 * Load Testing Script
 * Простое нагрузочное тестирование без внешних зависимостей
 * 
 * Запуск: npx ts-node scripts/load-test.ts
 * 
 * Параметры через env:
 *   TEST_URL=https://your-app.vercel.app
 *   CONCURRENT_USERS=10
 *   REQUESTS_PER_USER=5
 *   DELAY_MS=100
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const CONCURRENT_USERS = parseInt(process.env.CONCURRENT_USERS || '10');
const REQUESTS_PER_USER = parseInt(process.env.REQUESTS_PER_USER || '5');
const DELAY_MS = parseInt(process.env.DELAY_MS || '100');

interface RequestResult {
  url: string;
  status: number;
  duration: number;
  success: boolean;
  error?: string;
}

interface LoadTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  p50: number;
  p95: number;
  p99: number;
}

// Endpoints to test
const ENDPOINTS = [
  '/',
  '/api/generations/list?limit=5&skipCounts=true',
  '/api/workspaces',
  '/history',
];

async function makeRequest(url: string): Promise<RequestResult> {
  const start = Date.now();
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/json',
      },
    });
    
    const duration = Date.now() - start;
    
    return {
      url,
      status: response.status,
      duration,
      success: response.ok,
    };
  } catch (err: any) {
    const duration = Date.now() - start;
    return {
      url,
      status: 0,
      duration,
      success: false,
      error: err.message,
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

async function simulateUser(userId: number): Promise<RequestResult[]> {
  const results: RequestResult[] = [];
  
  for (let i = 0; i < REQUESTS_PER_USER; i++) {
    const endpoint = ENDPOINTS[Math.floor(Math.random() * ENDPOINTS.length)];
    const url = `${BASE_URL}${endpoint}`;
    
    const result = await makeRequest(url);
    results.push(result);
    
    // Small delay between requests
    await sleep(DELAY_MS);
  }
  
  return results;
}

async function runLoadTest(): Promise<void> {
  console.log('\n🚀 Load Testing Suite\n');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Concurrent Users: ${CONCURRENT_USERS}`);
  console.log(`Requests per User: ${REQUESTS_PER_USER}`);
  console.log(`Total Requests: ${CONCURRENT_USERS * REQUESTS_PER_USER}`);
  console.log(`Delay between requests: ${DELAY_MS}ms`);
  console.log('\n' + '─'.repeat(50) + '\n');
  
  console.log('Starting load test...\n');
  
  const startTime = Date.now();
  
  // Run all users concurrently
  const userPromises: Promise<RequestResult[]>[] = [];
  for (let i = 0; i < CONCURRENT_USERS; i++) {
    userPromises.push(simulateUser(i + 1));
  }
  
  const allResults = await Promise.all(userPromises);
  const flatResults = allResults.flat();
  
  const totalTime = (Date.now() - startTime) / 1000;
  
  // Calculate statistics
  const durations = flatResults.map(r => r.duration);
  const successfulRequests = flatResults.filter(r => r.success).length;
  const failedRequests = flatResults.filter(r => !r.success).length;
  
  const result: LoadTestResult = {
    totalRequests: flatResults.length,
    successfulRequests,
    failedRequests,
    avgResponseTime: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
    minResponseTime: Math.min(...durations),
    maxResponseTime: Math.max(...durations),
    requestsPerSecond: Math.round(flatResults.length / totalTime * 10) / 10,
    p50: percentile(durations, 50),
    p95: percentile(durations, 95),
    p99: percentile(durations, 99),
  };
  
  // Print results
  console.log('📊 Results:\n');
  console.log(`Total Time: ${totalTime.toFixed(2)}s`);
  console.log(`Total Requests: ${result.totalRequests}`);
  console.log(`Successful: ${result.successfulRequests} (${Math.round(result.successfulRequests / result.totalRequests * 100)}%)`);
  console.log(`Failed: ${result.failedRequests} (${Math.round(result.failedRequests / result.totalRequests * 100)}%)`);
  console.log(`\nResponse Times:`);
  console.log(`  Min: ${result.minResponseTime}ms`);
  console.log(`  Avg: ${result.avgResponseTime}ms`);
  console.log(`  Max: ${result.maxResponseTime}ms`);
  console.log(`  P50: ${result.p50}ms`);
  console.log(`  P95: ${result.p95}ms`);
  console.log(`  P99: ${result.p99}ms`);
  console.log(`\nThroughput: ${result.requestsPerSecond} req/s`);
  
  // Status codes breakdown
  const statusCodes: Record<number, number> = {};
  flatResults.forEach(r => {
    statusCodes[r.status] = (statusCodes[r.status] || 0) + 1;
  });
  
  console.log(`\nStatus Codes:`);
  Object.entries(statusCodes)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .forEach(([code, count]) => {
      console.log(`  ${code}: ${count}`);
    });
  
  // Errors
  const errors = flatResults.filter(r => r.error);
  if (errors.length > 0) {
    console.log(`\n❌ Errors (${errors.length}):`);
    const uniqueErrors = [...new Set(errors.map(e => e.error))];
    uniqueErrors.forEach(err => {
      const count = errors.filter(e => e.error === err).length;
      console.log(`  - ${err} (${count}x)`);
    });
  }
  
  console.log('\n' + '─'.repeat(50));
  
  // Assessment
  console.log('\n📈 Assessment:\n');
  
  if (result.failedRequests === 0 && result.p95 < 1000) {
    console.log('✅ EXCELLENT - No failures, fast response times');
  } else if (result.failedRequests / result.totalRequests < 0.01 && result.p95 < 2000) {
    console.log('✅ GOOD - Low failure rate, acceptable response times');
  } else if (result.failedRequests / result.totalRequests < 0.05 && result.p95 < 5000) {
    console.log('⚠️ ACCEPTABLE - Some failures, may need optimization');
  } else {
    console.log('❌ NEEDS IMPROVEMENT - High failure rate or slow responses');
  }
  
  console.log('\n');
}

// Run
runLoadTest().catch(console.error);


