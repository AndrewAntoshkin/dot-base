/**
 * API Testing Script
 * Запуск: npx ts-node scripts/test-api.ts
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

interface TestResult {
  name: string;
  endpoint: string;
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  error?: string;
}

const results: TestResult[] = [];

async function testEndpoint(
  name: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<TestResult> {
  const start = Date.now();
  
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    const duration = Date.now() - start;
    
    if (response.ok) {
      console.log(`✅ ${name} (${duration}ms)`);
      return { name, endpoint, status: 'pass', duration };
    } else {
      const error = await response.text();
      console.log(`❌ ${name} - ${response.status} (${duration}ms)`);
      return { name, endpoint, status: 'fail', duration, error };
    }
  } catch (err: any) {
    const duration = Date.now() - start;
    console.log(`❌ ${name} - ${err.message}`);
    return { name, endpoint, status: 'fail', duration, error: err.message };
  }
}

async function runTests() {
  console.log('\n🧪 API Testing Suite\n');
  console.log(`Base URL: ${BASE_URL}\n`);
  console.log('─'.repeat(50));
  
  // Health checks
  console.log('\n📡 Health Checks:\n');
  results.push(await testEndpoint('Homepage', '/'));
  
  // Auth endpoints (should return 401 without auth)
  console.log('\n🔐 Auth Endpoints:\n');
  results.push(await testEndpoint('Get User (no auth)', '/api/user'));
  
  // Public endpoints
  console.log('\n📂 API Endpoints:\n');
  
  // Workspaces
  results.push(await testEndpoint('List Workspaces', '/api/workspaces'));
  
  // Generations
  results.push(await testEndpoint(
    'List Generations', 
    '/api/generations/list?limit=5&skipCounts=true'
  ));
  
  results.push(await testEndpoint(
    'Generation Counts',
    '/api/generations/counts'
  ));
  
  results.push(await testEndpoint(
    'Filter Options',
    '/api/generations/filter-options'
  ));
  
  // Admin (should require auth)
  console.log('\n👑 Admin Endpoints:\n');
  results.push(await testEndpoint('Admin Stats', '/api/admin/stats'));
  results.push(await testEndpoint('Admin Filter Options', '/api/admin/filter-options'));
  
  // Summary
  console.log('\n' + '─'.repeat(50));
  console.log('\n📊 Summary:\n');
  
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const total = results.length;
  
  console.log(`Passed: ${passed}/${total}`);
  console.log(`Failed: ${failed}/${total}`);
  
  const avgDuration = Math.round(
    results.reduce((acc, r) => acc + r.duration, 0) / total
  );
  console.log(`Avg Response Time: ${avgDuration}ms`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results
      .filter(r => r.status === 'fail')
      .forEach(r => console.log(`  - ${r.name}: ${r.error}`));
  }
  
  console.log('\n');
}

// Run
runTests().catch(console.error);








