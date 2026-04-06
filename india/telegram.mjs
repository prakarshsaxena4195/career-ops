// india/telegram.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadConfig() {
  const configPath = join(__dirname, '../config/telegram_config.json');
  try {
    return JSON.parse(readFileSync(configPath, 'utf8'));
  } catch (err) {
    throw new Error(`telegram_config.json missing or malformed at ${configPath}: ${err.message}`);
  }
}

async function sendMessage(text, config) {
  const url = `https://api.telegram.org/bot${config.bot_token}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: config.chat_id, text, parse_mode: 'HTML' }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram API error ${res.status}: ${body}`);
  }
}

export function formatJob(job) {
  return [
    '🎯 <b>New Senior PM Role!</b>',
    '',
    `🏢 ${job.company}`,
    `📋 ${job.title}`,
    `📍 ${job.location || 'Bangalore'}`,
    `🔗 ${job.jobUrl}`,
  ].join('\n');
}

export function formatSummary({ newCount, bySource, errors, dryRun }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  });

  const lines = [
    `📊 <b>Scan Complete</b> · ${dateStr}${dryRun ? ' (DRY RUN)' : ''}`,
    '',
    `✅ ${newCount} new Senior PM roles found`,
    `🔍 LinkedIn: ${bySource.linkedin ?? 0} · Naukri: ${bySource.naukri ?? 0} · Company pages: ${bySource.careers ?? 0} · Portals: ${bySource.websearch ?? 0}`,
    '⏭ Next scan in 2 hours',
    '',
    'Run /career-ops pipeline to evaluate with ATS scores',
  ];

  if (errors.length > 0) {
    lines.push('');
    lines.push(`⚠️ Failed sources: ${errors.join(', ')}`);
  }

  return lines.join('\n');
}

export async function sendJob(job, dryRun = false) {
  const text = formatJob(job);
  if (dryRun) {
    console.log('[DRY RUN] Job:\n' + text + '\n');
    return;
  }
  const config = loadConfig();
  await sendMessage(text, config);
}

export async function sendSummary(stats, dryRun = false) {
  const text = formatSummary(stats);
  if (dryRun) {
    console.log('[DRY RUN] Summary:\n' + text + '\n');
    return;
  }
  if (stats.newCount === 0) return; // silent on zero new jobs
  const config = loadConfig();
  await sendMessage(text, config);
}
