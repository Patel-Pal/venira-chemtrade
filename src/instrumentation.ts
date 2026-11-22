/**
 * Runs once when the Next.js server starts (dev and production, not during `next build`).
 * Opens the database connection and its pool up front so the first visitor does not pay for it.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || process.env.NEXT_PHASE === 'phase-production-build') return;
  await import('./instrumentation-node');
}
