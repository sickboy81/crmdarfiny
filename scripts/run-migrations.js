const fs = require('fs');
const path = require('path');

const PROJECT_REF = 'vowiojgsgbsqmknfyrbe';
const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');

const TOKEN_FILE = path.join(__dirname, '..', '..', 'CRM Whatsapp', 'sb_token.txt');
let ACCESS_TOKEN = process.argv[2];
if (!ACCESS_TOKEN && fs.existsSync(TOKEN_FILE)) {
  ACCESS_TOKEN = fs.readFileSync(TOKEN_FILE, 'utf-8').trim();
}

if (!ACCESS_TOKEN) {
  console.log('No access token found.');
  process.exit(1);
}

async function runSQL(sql) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ query: sql }),
    }
  );
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.substring(0, 500)}`);
  return text;
}

async function main() {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql') && !f.includes('combined') && !f.includes('custom'))
    .sort();

  console.log(`Found ${files.length} migrations\n`);

  let success = 0;
  let failed = 0;

  for (const file of files) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const raw = fs.readFileSync(filePath, 'utf-8');

    const sql = raw
      .replace(/^\uFEFF/, '')
      .replace(/\u2014/g, '--')
      .replace(/\u2013/g, '--')
      .replace(/\u2018/g, "'")
      .replace(/\u2019/g, "'")
      .replace(/\u201C/g, '"')
      .replace(/\u201D/g, '"')
      .replace(/\u2026/g, '...')
      .trim();

    if (!sql) {
      console.log(`  SKIP  ${file} (empty)`);
      continue;
    }

    const size = Math.round(sql.length / 1024);
    process.stdout.write(`  RUN   ${file} (${size}KB) ... `);

    try {
      await runSQL(sql);
      console.log(`OK`);
      success++;
    } catch (err) {
      const msg = err.message;
      if (msg.includes('already exists') || msg.includes('does not exist')) {
        console.log(`SKIP (already applied)`);
        success++;
      } else {
        console.log(`FAIL`);
        console.log(`        ${msg.substring(0, 300)}`);
        failed++;
      }
    }
  }

  console.log(`\n============================================================`);
  console.log(`Results: ${success} success, ${failed} failed`);
  console.log(`============================================================`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
