// Brings the shop's data out of MongoDB (MongoDB Atlas, or MongoDB on a
// computer), which older versions of the app used, into a normal backup
// folder. Restore that backup in the app afterwards:
//   first start -> "Restore from a backup", or Back office -> Backup and restore.
//
// Run it once, with the internet on if the data is in Atlas:
//   npm run import-mongodb                    (uses MONGO_URI from server/.env)
//   npm run import-mongodb -- "mongodb+srv://..." "E:\Shop Backups"
//
// Nothing is changed or deleted in MongoDB.
require('dotenv').config();
const dns = require('dns');
const fs = require('fs');
const path = require('path');

const PUBLIC_DNS_SERVERS = ['1.1.1.1', '8.8.8.8'];

// Makes a backup folder name like universe-pos-backup-2026-11-02-091500-from-mongodb.
function folderName(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `universe-pos-backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}-from-mongodb`;
}

// Connects, trying public DNS once if the router refuses Atlas's special lookup.
async function connect(MongoClient, uri) {
  try {
    return await MongoClient.connect(uri, { serverSelectionTimeoutMS: 15000 });
  } catch (error) {
    if (!uri.startsWith('mongodb+srv://') || !/querySrv|queryTxt/.test(error.message)) throw error;
    console.log('The DNS lookup for Atlas failed; trying again with public DNS servers...');
    dns.setServers(PUBLIC_DNS_SERVERS);
    return MongoClient.connect(uri, { serverSelectionTimeoutMS: 15000 });
  }
}

async function main() {
  let mongodb;
  try {
    mongodb = require('mongodb'); // a development-only package, see package.json
  } catch {
    console.error('The "mongodb" package is missing. Run "npm install" in the server folder first.');
    process.exit(1);
  }
  const { MongoClient, BSON } = mongodb;

  const uri = process.argv[2] || process.env.MONGO_URI;
  if (!uri || !uri.startsWith('mongodb')) {
    console.error('No MongoDB address. Put MONGO_URI=... in server/.env, or run:\n  npm run import-mongodb -- "mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/universe_pos"');
    process.exit(1);
  }
  const parent = process.argv[3] || path.join(__dirname, '..', 'backups');

  console.log('Connecting to MongoDB...');
  const client = await connect(MongoClient, uri);
  try {
    const hasDatabaseName = /^mongodb(\+srv)?:\/\/[^/]+\/[^/?]+/.test(uri);
    const db = client.db(hasDatabaseName ? undefined : 'universe_pos');
    console.log(`Reading the database "${db.databaseName}"...`);

    const folder = path.join(parent, folderName());
    fs.mkdirSync(path.join(folder, 'collections'), { recursive: true });

    const counts = {};
    for (const { name } of await db.listCollections({}, { nameOnly: true }).toArray()) {
      if (name.startsWith('system.')) continue;
      const lines = [];
      for await (const record of db.collection(name).find()) lines.push(BSON.EJSON.stringify(record, { relaxed: false }));
      fs.writeFileSync(path.join(folder, 'collections', `${name}.jsonl`), lines.length ? `${lines.join('\n')}\n` : '');
      counts[name] = lines.length;
      console.log(`  ${name}: ${lines.length}`);
    }
    if (!counts.users) throw new Error('This database has no staff accounts, so it is not a Universe POS shop. Check the database name in the address.');

    const settings = await db.collection('settings').findOne();
    // Written last: a folder without it is never mistaken for a complete backup.
    fs.writeFileSync(path.join(folder, 'manifest.json'), JSON.stringify({
      app: 'Universe POS',
      formatVersion: 1,
      createdAt: new Date().toISOString(),
      reason: 'import',
      storeName: settings?.storeName || '',
      counts,
    }, null, 2));

    console.log(`\nDone. The shop's data is in:\n  ${folder}`);
    console.log(`\nNow open Universe POS and restore it:\n  - first start: "Restore from a backup", folder: ${parent}\n  - or Back office -> Backup and restore -> choose the folder ${parent} -> Restore`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(`Import failed: ${error.message}`);
  process.exit(1);
});
