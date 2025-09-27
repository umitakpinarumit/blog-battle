const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', '..', '..', 'db-json');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const DB = (process.env.MONGODB_DB && process.env.MONGODB_DB.trim()) || 'blog_battle';

const collections = ['users','posts','categories','matches','tournaments','votes','notifications'];

function hasMongoExport() {
  try {
    execSync('mongoexport --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

if (!hasMongoExport()) {
  console.error('mongoexport bulunamadı. Lütfen MongoDB Database Tools kurun ve PATH\'e ekleyin.');
  process.exit(1);
}

for (const c of collections) {
  const outFile = path.join(OUT, `${c}.json`);
  const cmd = `mongoexport --uri "${URI}" --db ${DB} --collection ${c} --out "${outFile}" --jsonArray`;
  console.log('> ' + cmd);
  execSync(cmd, { stdio: 'inherit' });
}

console.log('JSON export tamamlandı: ' + OUT);


