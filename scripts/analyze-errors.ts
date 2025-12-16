/**
 * Script to analyze all generation errors
 * Run with: npx tsx scripts/analyze-errors.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function analyzeErrors() {
  console.log('Analyzing all generation errors...\n');

  // Get all failed generations
  const { data: errors, error } = await supabase
    .from('generations')
    .select('id, model_name, action, status, error_message, replicate_output, created_at')
    .eq('status', 'failed')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching:', error);
    return;
  }

  console.log(`Found ${errors?.length || 0} failed generations\n`);

  // Group errors by type
  const errorGroups: Record<string, { count: number; models: Set<string>; examples: string[] }> = {};

  errors?.forEach(err => {
    // Extract error message from different sources
    let errorMsg = err.error_message || '';
    
    // Try to get error from replicate_output
    if (!errorMsg && err.replicate_output) {
      try {
        const output = typeof err.replicate_output === 'string' 
          ? JSON.parse(err.replicate_output) 
          : err.replicate_output;
        errorMsg = output?.error || output?.message || '';
      } catch (e) {
        // ignore
      }
    }
    
    // Normalize error message for grouping
    let errorKey = errorMsg || 'Unknown error';
    
    // Truncate long messages
    if (errorKey.length > 100) {
      errorKey = errorKey.substring(0, 100) + '...';
    }
    
    if (!errorGroups[errorKey]) {
      errorGroups[errorKey] = { count: 0, models: new Set(), examples: [] };
    }
    
    errorGroups[errorKey].count++;
    errorGroups[errorKey].models.add(err.model_name || 'unknown');
    
    if (errorGroups[errorKey].examples.length < 2) {
      errorGroups[errorKey].examples.push(err.id);
    }
  });

  // Sort by count
  const sortedErrors = Object.entries(errorGroups)
    .sort((a, b) => b[1].count - a[1].count);

  console.log('=== ERROR ANALYSIS ===\n');

  sortedErrors.forEach(([errorMsg, data], index) => {
    console.log(`${index + 1}. [${data.count}x] ${errorMsg}`);
    console.log(`   Models: ${Array.from(data.models).join(', ')}`);
    console.log('');
  });

  // Group by model
  console.log('\n=== ERRORS BY MODEL ===\n');
  
  const modelErrors: Record<string, number> = {};
  errors?.forEach(err => {
    const model = err.model_name || 'unknown';
    modelErrors[model] = (modelErrors[model] || 0) + 1;
  });

  Object.entries(modelErrors)
    .sort((a, b) => b[1] - a[1])
    .forEach(([model, count]) => {
      console.log(`  ${model}: ${count} errors`);
    });

  // Get recent errors with full details
  console.log('\n\n=== RECENT ERRORS (last 20) ===\n');
  
  const recentErrors = errors?.slice(0, 20) || [];
  
  for (const err of recentErrors) {
    console.log(`─────────────────────────────────────────`);
    console.log(`Model: ${err.model_name}`);
    console.log(`Action: ${err.action}`);
    console.log(`Date: ${new Date(err.created_at).toLocaleString('ru-RU')}`);
    console.log(`Error: ${err.error_message || 'No error message'}`);
    
    // Try to extract more details from replicate_output
    if (err.replicate_output) {
      try {
        const output = typeof err.replicate_output === 'string' 
          ? JSON.parse(err.replicate_output) 
          : err.replicate_output;
        
        if (output?.error) {
          console.log(`Replicate Error: ${output.error}`);
        }
        if (output?.logs) {
          const logs = output.logs.substring(0, 500);
          console.log(`Logs: ${logs}`);
        }
      } catch (e) {
        // Check if it's a string with error
        if (typeof err.replicate_output === 'string' && err.replicate_output.length < 500) {
          console.log(`Output: ${err.replicate_output}`);
        }
      }
    }
    console.log('');
  }

  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`Total errors: ${errors?.length || 0}`);
  console.log(`Unique error types: ${Object.keys(errorGroups).length}`);
  console.log(`Models affected: ${Object.keys(modelErrors).length}`);
}

analyzeErrors().catch(console.error);
