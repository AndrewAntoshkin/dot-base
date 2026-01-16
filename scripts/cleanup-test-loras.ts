#!/usr/bin/env tsx
/**
 * Cleanup script to delete test LoRA models from database
 * Usage: 
 *   npx tsx scripts/cleanup-test-loras.ts [user_id]
 * 
 * Note: For email-based cleanup, use SQL script: supabase/cleanup_my_loras.sql
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createServiceRoleClient } from '../lib/supabase/server';
import logger from '../lib/logger';

async function cleanupTestLoras(userId?: string) {
  const serviceClient = createServiceRoleClient();

  try {
    // Build query
    let query = serviceClient
      .from('user_loras')
      .select('id, name, status, created_at, user_id')
      .is('deleted_at', null);

    if (userId) {
      query = query.eq('user_id', userId);
      logger.info(`Filtering LoRAs for user_id: ${userId}`);
    } else {
      logger.info('No user_id provided - will process all users');
    }

    const { data: loras, error } = await query;

    if (error) {
      logger.error('Error fetching LoRAs:', error);
      process.exit(1);
    }

    if (!loras || loras.length === 0) {
      logger.info('No LoRAs found to delete');
      return;
    }

    logger.info(`Found ${loras.length} LoRAs`);

    // Filter test models (names containing "test", "test1", "bot", etc.)
    const testPatterns = /test|bot\d+|demo|sample|temp|tmp/i;
    const testLoras = loras.filter((lora: any) => {
      const name = lora.name?.toLowerCase() || '';
      return testPatterns.test(name);
    });

    if (testLoras.length === 0) {
      logger.info('No test LoRAs found to delete');
      return;
    }

    logger.info(`Found ${testLoras.length} test LoRAs to delete:`);
    testLoras.forEach((lora: any) => {
      logger.info(`  - ${lora.name} (${lora.status}) - ${lora.id}`);
    });

    // Ask for confirmation
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question(`\nDelete ${testLoras.length} test LoRAs? (yes/no): `, resolve);
    });

    rl.close();

    if (answer.toLowerCase() !== 'yes') {
      logger.info('Cancelled');
      return;
    }

    // Delete training images first
    const loraIds = testLoras.map((l: any) => l.id);
    const { error: imagesError } = await serviceClient
      .from('lora_training_images')
      .delete()
      .in('lora_id', loraIds);

    if (imagesError) {
      logger.error('Error deleting training images:', imagesError);
    } else {
      logger.info(`Deleted training images for ${loraIds.length} LoRAs`);
    }

    // Soft delete LoRAs
    const { error: deleteError } = await serviceClient
      .from('user_loras')
      .update({ deleted_at: new Date().toISOString() })
      .in('id', loraIds);

    if (deleteError) {
      logger.error('Error deleting LoRAs:', deleteError);
      process.exit(1);
    }

    logger.info(`Successfully deleted ${testLoras.length} test LoRAs`);
  } catch (error) {
    logger.error('Error:', error);
    process.exit(1);
  }
}

// Get user_id from command line args (UUID format)
const userIdOrEmail = process.argv[2];

if (userIdOrEmail && userIdOrEmail.includes('@')) {
  logger.error('Email not supported in this script. Use SQL script: supabase/cleanup_my_loras.sql');
  logger.info('Or provide user_id (UUID) directly');
  process.exit(1);
}

// If provided, treat as user_id
if (userIdOrEmail) {
  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userIdOrEmail)) {
    logger.error('Invalid user_id format. Expected UUID.');
    process.exit(1);
  }
}

cleanupTestLoras(userIdOrEmail)
  .then(() => {
    logger.info('Cleanup completed');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Cleanup failed:', error);
    process.exit(1);
  });
