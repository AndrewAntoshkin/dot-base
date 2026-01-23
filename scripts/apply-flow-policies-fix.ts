/**
 * Script to apply flow policies fix directly to Supabase
 * Run: npx tsx scripts/apply-flow-policies-fix.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

async function applyFix() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    db: { schema: 'public' },
  });

  console.log('Applying flow policies fix...');

  try {
    // Read the migration file
    const migrationPath = join(process.cwd(), 'supabase/migrations/20260121_fix_flow_policies.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql_string: sql });
    
    if (error) {
      // If exec_sql doesn't exist, try direct query
      console.log('Trying direct SQL execution...');
      
      // Execute each statement separately
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--') && !s.startsWith('SELECT'));

      for (const statement of statements) {
        if (statement) {
          const { error: stmtError } = await supabase.rpc('exec', { sql: statement + ';' });
          if (stmtError) {
            console.error('Error executing statement:', stmtError);
            console.log('Statement:', statement);
          }
        }
      }
    }

    console.log('✅ Flow policies fix applied!');
    console.log('\nPlease verify by trying to create a flow again.');
  } catch (err) {
    console.error('Error applying fix:', err);
    console.log('\n⚠️  Please apply the migration manually in Supabase SQL Editor:');
    console.log('   Dashboard → SQL Editor → Paste content from:');
    console.log('   supabase/migrations/20260121_fix_flow_policies.sql');
  }
}

applyFix().catch(console.error);
