-- Migration: Add 'asset' to flow_block_type enum
-- Date: 2026-02-22
-- Reason: New "asset" node type was added in code but missing from DB enum

ALTER TYPE flow_block_type ADD VALUE IF NOT EXISTS 'asset';
