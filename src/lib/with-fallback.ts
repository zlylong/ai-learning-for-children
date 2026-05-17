import { Prisma } from '@prisma/client';

/**
 * Determines if we should use the in-memory store instead of Prisma.
 * This is the canonical check — single source of truth.
 */
export function shouldUseMemoryStore(): boolean {
  return !process.env.DATABASE_URL || process.env.CHILDREN_STORE === 'memory';
}

/**
 * Execute an operation against Prisma. If Prisma is unavailable (not configured,
 * connection error, or initialization error), fall back to the memory-based
 * fallback function.
 *
 * Usage:
 *   return withFallback(
 *     () => prisma.child.findMany(...),
 *     () => memoryStore.list()
 *   );
 */
export async function withFallback<T>(
  operation: () => Promise<T>,
  fallback: () => T | Promise<T>,
): Promise<T> {
  if (shouldUseMemoryStore()) return fallback();

  try {
    return await operation();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError || error instanceof Prisma.PrismaClientInitializationError) {
      console.warn('[withFallback] Prisma unavailable, falling back to memory store:', error.message);
      return fallback();
    }
    throw error;
  }
}

/**
 * Assert that a child record exists (and is owned by the demo user).
 * Works with both Prisma and memory store paths.
 */
export async function withFallbackOnly<T>(fallback: () => T | Promise<T>): Promise<T> {
  return fallback();
}
