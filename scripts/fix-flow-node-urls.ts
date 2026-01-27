/**
 * Script to fix flow node URLs that have expired Replicate URLs
 * 
 * This script:
 * 1. Finds all flow nodes with generation_id
 * 2. For each node, looks up the generation's permanent URL (from Supabase Storage)
 * 3. Updates the flow node with the permanent URL
 * 
 * Run: npx ts-node --skipProject scripts/fix-flow-node-urls.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixFlowNodeUrls() {
  console.log('🔧 Starting flow node URL fix...\n');

  // Get all flow nodes with generation_id
  const { data: flowNodes, error: nodesError } = await supabase
    .from('flow_nodes')
    .select('id, generation_id, output_url, flow_id')
    .not('generation_id', 'is', null);

  if (nodesError) {
    console.error('Error fetching flow nodes:', nodesError);
    return;
  }

  console.log(`Found ${flowNodes?.length || 0} flow nodes with generation_id\n`);

  if (!flowNodes || flowNodes.length === 0) {
    console.log('No flow nodes to process.');
    return;
  }

  let updated = 0;
  let skipped = 0;
  let notFound = 0;
  let errors = 0;

  for (const node of flowNodes) {
    const currentUrl = node.output_url || '';
    
    // Check if URL is a temporary Replicate URL
    const isReplicateUrl = currentUrl.includes('replicate.delivery') || 
                           currentUrl.includes('pbxt.replicate.com');
    
    // Check if URL is already a Supabase Storage URL
    const isSupabaseUrl = currentUrl.includes('supabase.co/storage') || 
                          currentUrl.includes('supabase.in/storage');

    if (isSupabaseUrl && !isReplicateUrl) {
      // Already has a permanent URL
      skipped++;
      continue;
    }

    // Look up the generation
    const { data: generation, error: genError } = await supabase
      .from('generations')
      .select('id, output_urls')
      .eq('id', node.generation_id)
      .single();

    if (genError || !generation) {
      console.log(`  ⚠️  Generation ${node.generation_id} not found for node ${node.id}`);
      notFound++;
      continue;
    }

    const permanentUrl = generation.output_urls?.[0];
    
    if (!permanentUrl) {
      console.log(`  ⚠️  No output_urls in generation ${node.generation_id}`);
      notFound++;
      continue;
    }

    // Check if the permanent URL is a Supabase Storage URL
    const isPermanentSupabase = permanentUrl.includes('supabase.co/storage') || 
                                 permanentUrl.includes('supabase.in/storage');

    if (!isPermanentSupabase) {
      console.log(`  ⚠️  Generation ${node.generation_id} still has temporary URL`);
      skipped++;
      continue;
    }

    // Update the flow node with the permanent URL
    const { error: updateError } = await supabase
      .from('flow_nodes')
      .update({ output_url: permanentUrl })
      .eq('id', node.id);

    if (updateError) {
      console.log(`  ❌ Error updating node ${node.id}:`, updateError.message);
      errors++;
      continue;
    }

    console.log(`  ✅ Updated node ${node.id} with permanent URL`);
    updated++;
  }

  console.log('\n📊 Summary:');
  console.log(`  ✅ Updated: ${updated}`);
  console.log(`  ⏭️  Skipped (already permanent): ${skipped}`);
  console.log(`  ⚠️  Not found: ${notFound}`);
  console.log(`  ❌ Errors: ${errors}`);
  console.log('\nDone!');
}

fixFlowNodeUrls().catch(console.error);
