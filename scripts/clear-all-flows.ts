/**
 * Script to clear all flows from the database
 * Run: npx tsx scripts/clear-all-flows.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables. Make sure .env.local exists with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function clearAllFlows() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('Deleting all flow edges...');
  const { error: edgesError } = await supabase.from('flow_edges').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (edgesError) {
    console.error('Error deleting edges:', edgesError);
  }

  console.log('Deleting all flow nodes...');
  const { error: nodesError } = await supabase.from('flow_nodes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (nodesError) {
    console.error('Error deleting nodes:', nodesError);
  }

  console.log('Deleting all flows...');
  const { error: flowsError } = await supabase.from('flows').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (flowsError) {
    console.error('Error deleting flows:', flowsError);
  }

  console.log('✅ All flows cleared!');
}

clearAllFlows().catch(console.error);
