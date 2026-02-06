/**
 * Orders API Service - Backward Compatibility Layer
 *
 * This file re-exports from the modular orders/ folder.
 * For new code, import directly from './orders' instead.
 */

// Re-export everything from the orders module
export * from './orders'

// Re-export types for convenience
export type { OrderComment, CommentTemplate } from '../types/orders'
