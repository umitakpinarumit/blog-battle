const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const IN = path.join(__dirname, '..', '..', '..', 'db-json');
if (!fs.existsSync(IN)) {
  console.error('db-json klasörü bulunamadı.');
  process.exit(1);
}

const URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const DB = (process.env.MONGODB_DB && process.env.MONGODB_DB.trim()) || 'blog_battle';

const collections = ['users','posts','categories','matches','tournaments','votes','notifications'];

function hasMongoImport() {
  try {
    execSync('mongoimport --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

if (!hasMongoImport()) {
  console.error('mongoimport bulunamadı. Lütfen MongoDB Database Tools kurun ve PATH\'e ekleyin.');
  process.exit(1);
}

for (const c of collections) {
  const file = path.join(IN, `${c}.json`);
  if (!fs.existsSync(file)) {
    console.warn(`Atlanıyor: ${file} yok`);
    continue;
  }
  const cmd = `mongoimport --uri "${URI}" --db ${DB} --collection ${c} --drop --file "${file}" --jsonArray`;
  console.log('> ' + cmd);
  execSync(cmd, { stdio: 'inherit' });
}

console.log('JSON import tamamlandı.');


