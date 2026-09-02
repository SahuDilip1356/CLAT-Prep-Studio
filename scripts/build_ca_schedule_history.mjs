import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { mergeScheduleRuns, summarizeCARun } from '../shared/ca-public-history.js';

const root = resolve(import.meta.dirname, '..');
const auditDirectory = resolve(root, 'CA_Agent_Logs');
const outputFile = resolve(root, 'src/data/ca_schedule_history.json');

const names = (await readdir(auditDirectory))
  .filter((name) => /^\d{4}-\d{2}-\d{2}.*\.json$/i.test(name))
  .sort()
  .reverse()
  .slice(0, 30);

const runs = await Promise.all(names.map(async (name) => {
  const audit = JSON.parse(await readFile(resolve(auditDirectory, name), 'utf8'));
  return summarizeCARun(audit, 'REPOSITORY');
}));

const payload = {
  generatedAt: new Date().toISOString(),
  runs: mergeScheduleRuns(runs)
};

await writeFile(outputFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`Wrote ${payload.runs.length} sanitized CA schedule runs to ${outputFile}`);

