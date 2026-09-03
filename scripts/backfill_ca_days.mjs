#!/usr/bin/env node
/**
 * Re-run the daily current-affairs agent for days the scheduler missed.
 *
 *   node scripts/backfill_ca_days.mjs --list
 *   node scripts/backfill_ca_days.mjs --dry-run 2026-08-31
 *   node scripts/backfill_ca_days.mjs 2026-08-31 2026-08-26
 *   node scripts/backfill_ca_days.mjs --all
 *
 * Each day runs as its own dated run with a strict date window: a candidate
 * whose eventDate falls outside the day, or which has no trusted source
 * published inside it, is rejected by the server rather than trusted. That
 * guard is the point of this script. A backfill asks a live web search for news
 * from weeks ago, and without it you get today's news filed under an old date,
 * which is worse than the gap it was meant to fill.
 *
 * Needs the same environment as the cron: OPENAI_API_KEY, and Firebase
 * credentials via FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH.
 */
import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOG_DIR = path.join(REPO_ROOT, 'CA_Agent_Logs');
const IST_NOON = 'T06:30:00+05:30';

const isDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const daysBetween = (from, to) => {
  const out = [];
  for (let d = new Date(`${from}T12:00:00Z`); d <= new Date(`${to}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
};

/** Days with no run log between the first and last that do have one. */
const findMissingDays = async () => {
  const files = (await readdir(LOG_DIR)).filter((f) => f.endsWith('.json'));
  const ran = new Set(files.map((f) => f.slice(0, 10)).filter(isDate));
  if (!ran.size) return [];
  const sorted = [...ran].sort();
  return daysBetween(sorted[0], sorted[sorted.length - 1]).filter((day) => !ran.has(day));
};

const main = async () => {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const listOnly = args.includes('--list');
  const all = args.includes('--all');
  const explicit = args.filter(isDate);

  const missing = await findMissingDays();
  if (listOnly) {
    console.log(missing.length ? missing.join('\n') : 'No gaps in the run log.');
    return;
  }

  const days = explicit.length ? explicit : all ? missing : [];
  if (!days.length) {
    console.error('Nothing to do. Pass dates, --all, or --list. Days currently missing:');
    console.error(missing.join(', ') || '(none)');
    process.exitCode = 1;
    return;
  }

  const unknown = days.filter((day) => !missing.includes(day));
  if (unknown.length && !dryRun) {
    console.error(`Refusing: these already have a run log, re-running would duplicate work: ${unknown.join(', ')}`);
    console.error('Delete the log first if a re-run is genuinely intended.');
    process.exitCode = 1;
    return;
  }

  if (dryRun) {
    console.log(`Would back-fill ${days.length} day(s): ${days.join(', ')}`);
    console.log('Each runs with a strict date window; candidates dated outside it are rejected.');
    return;
  }

  const { runDailyCAOrchestration } = await import('../functions/ca-orchestrator.js');
  let recovered = 0;
  for (const day of days) {
    process.stdout.write(`${day} ... `);
    try {
      const result = await runDailyCAOrchestration({
        now: new Date(`${day}${IST_NOON}`), backfill: true, force: true
      });
      const published = result.publishedCount || 0;
      const rejected = (result.ignored || []).filter(
        (item) => (item.reasons || []).some((r) => r.includes('window'))
      ).length;
      recovered += published;
      console.log(
        `${published} published, ${result.ignoredCount || 0} ignored`
        + (rejected ? ` (${rejected} rejected as outside the day)` : '')
      );
    } catch (error) {
      console.log(`FAILED — ${error.message}`);
    }
  }
  console.log(`\nRecovered ${recovered} dossier(s) across ${days.length} day(s).`);
  console.log('Rebuild the derived data before shipping: npm run build:section-banks');
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
