/**
 * Check cost data in generations
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

async function check() {
  // Проверяем что есть в replicate_output
  const { data, error } = await supabase
    .from('generations')
    .select('id, replicate_output, cost_usd, replicate_model')
    .eq('status', 'completed')
    .not('replicate_output', 'is', null)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Sample replicate_output structures:\n');
  for (const row of data || []) {
    const output = row.replicate_output as any;
    console.log('ID:', row.id);
    console.log('Model:', row.replicate_model);
    console.log('cost_usd in DB:', row.cost_usd);
    console.log('metrics:', JSON.stringify(output?.metrics, null, 2));
    // Check for any cost-related fields
    const keys = Object.keys(output || {});
    const costKeys = keys.filter(k => k.toLowerCase().includes('cost') || k.toLowerCase().includes('price'));
    if (costKeys.length > 0) {
      console.log('Cost-related keys:', costKeys);
    }
    console.log('---');
  }
  
  // Статистика
  const { count: total } = await supabase
    .from('generations')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed');
    
  const { count: withCost } = await supabase
    .from('generations')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed')
    .not('cost_usd', 'is', null);
    
  // Сумма cost_usd
  const { data: sumData } = await supabase
    .from('generations')
    .select('cost_usd')
    .eq('status', 'completed')
    .not('cost_usd', 'is', null);
    
  const totalCostUsd = (sumData || []).reduce((sum, row) => sum + (row.cost_usd || 0), 0);
    
  console.log('\n📊 Statistics:');
  console.log('Total completed:', total);
  console.log('With cost_usd:', withCost);
  console.log('Without cost_usd:', (total || 0) - (withCost || 0));
  console.log('\n💰 Current totals:');
  console.log('Total cost USD:', totalCostUsd.toFixed(2));
  console.log('Total cost RUB (with 50% markup):', Math.round(totalCostUsd * 1.5 * 80).toLocaleString('ru-RU') + '₽');
}

check().catch(console.error);
