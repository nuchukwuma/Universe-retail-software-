const dns = require('dns');
const mongoose = require('mongoose');

// The shop's data is kept in the MongoDB on THIS computer.
//
// If MONGO_URI in .env points to an online database (MongoDB Atlas), the
// app still uses the database on this computer, and the first time it
// finds it empty it copies everything from the online one into it. The
// online database is left as it was (nothing is deleted there).
// Until MongoDB is installed on this computer, the online database is used,
// with a warning. (ALLOW_ONLINE_DATABASE=true in .env keeps using it on purpose.)

const LOCAL_URI = process.env.LOCAL_MONGO_URI || 'mongodb://127.0.0.1:27017/universe_pos';

// Public DNS servers (Cloudflare and Google), used when the computer's own
// DNS refuses the special lookup that Atlas addresses need.
const PUBLIC_DNS_SERVERS = ['1.1.1.1', '8.8.8.8'];

const CONNECT_OPTIONS = { serverSelectionTimeoutMS: 10000 };
const LOCAL_CHECK_OPTIONS = { serverSelectionTimeoutMS: 5000 };
const COPY_BATCH_SIZE = 500;

// The address the app is actually using (set once connected).
let connectedUri = null;

// True if the database address is on this computer (so the shop's data
// never leaves it). Atlas (mongodb+srv://) and other computers are online.
// With no address given, answers for the database the app is using.
function isLocalDatabase(uri = connectedUri || process.env.MONGO_URI || LOCAL_URI) {
  const match = /^mongodb:\/\/(?:[^@/]*@)?([^/?]+)/.exec(uri);
  if (!match) return false;
  return match[1].split(',').every((host) => {
    const name = host.replace(/:\d+$/, '').replace(/^\[|\]$/g, '').toLowerCase();
    return ['localhost', '127.0.0.1', '::1'].includes(name);
  });
}

// Says what to check, depending on where the database is.
function connectionHelp(uri) {
  if (uri.startsWith('mongodb+srv://')) {
    return 'Check the internet connection, the username and password in MONGO_URI, and that this computer\'s IP address is allowed in Atlas (Network Access).';
  }
  return 'Is MongoDB installed and running?';
}

// Runs "open" (which connects to "uri"). Atlas addresses (mongodb+srv://)
// start with a special DNS lookup ("querySrv") that some routers and
// Windows set-ups refuse, so then it tries once more using public DNS.
async function withDnsRetry(uri, open) {
  try {
    return await open();
  } catch (error) {
    if (!uri.startsWith('mongodb+srv://') || !/querySrv|queryTxt/.test(error.message)) {
      throw new Error(`Could not connect to MongoDB (${error.message}). ${connectionHelp(uri)}`);
    }
    console.warn(`The DNS lookup for MongoDB Atlas failed (${error.message}). Trying again with public DNS servers ${PUBLIC_DNS_SERVERS.join(', ')}...`);
    dns.setServers(PUBLIC_DNS_SERVERS);
    try {
      return await open();
    } catch (retryError) {
      throw new Error(`Could not connect to MongoDB (${retryError.message}). ${connectionHelp(uri)}`);
    }
  }
}

// Makes "uri" the app's database.
async function useDatabase(uri, options = CONNECT_OPTIONS) {
  await withDnsRetry(uri, () => mongoose.connect(uri, options));
  connectedUri = uri;
}

// True if a database holds a shop (every shop has at least one staff account).
async function hasShopData(db) {
  return (await db.collection('users').countDocuments({}, { limit: 1 })) > 0;
}

// The tables in a database (leaving out MongoDB's own "system." ones).
async function tableNames(db) {
  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  return collections.map((c) => c.name).filter((name) => !name.startsWith('system.'));
}

// Copies every record of every table from one database into another
// (which must hold no shop yet). Returns { table: count }.
async function copyAllTables(fromDb, toDb) {
  // The empty database may still have a settings record or two from an
  // earlier start; clear it so nothing is doubled.
  for (const name of await tableNames(toDb)) await toDb.collection(name).deleteMany({});

  const counts = {};
  for (const name of await tableNames(fromDb)) {
    let batch = [];
    counts[name] = 0;
    for await (const record of fromDb.collection(name).find()) {
      batch.push(record);
      if (batch.length >= COPY_BATCH_SIZE) {
        await toDb.collection(name).insertMany(batch, { ordered: false });
        counts[name] += batch.length;
        batch = [];
      }
    }
    if (batch.length) {
      await toDb.collection(name).insertMany(batch, { ordered: false });
      counts[name] += batch.length;
    }
  }
  return counts;
}

// The first time the database on this computer is used, copy the shop's
// data into it from the online database. Never copies over existing data.
// "openOnline" connects to the online database and returns its connection.
async function bringDataHere(localDb, onlineUri, openOnline) {
  if (await hasShopData(localDb)) {
    console.log('Using the shop\'s data on this computer. (MONGO_URI in server/.env still names an online database; it is no longer used.)');
    return null;
  }

  let online;
  try {
    online = await withDnsRetry(onlineUri, openOnline);
  } catch (error) {
    throw new Error(
      'The shop\'s data is still in the online database and could not be copied to this computer, because the online database could not be reached '
      + `(${error.message}). Connect to the internet once and start the app again; after that it works offline.`
    );
  }

  try {
    if (!(await hasShopData(online.db))) {
      console.log('The online database has no shop in it. Starting with an empty shop on this computer.');
      return null;
    }
    console.log('Copying the shop\'s data from the online database to this computer (one time only)...');
    try {
      const counts = await copyAllTables(online.db, localDb);
      const summary = Object.entries(counts).map(([name, n]) => `${name}: ${n}`).join(', ');
      console.log(`Done. The shop's data is now saved on this computer (${summary}). The online copy was left as it was.`);
      return counts;
    } catch (error) {
      // Leave this computer's database empty, so the copy starts again next time.
      for (const name of await tableNames(localDb)) await localDb.collection(name).deleteMany({});
      throw new Error(`Copying the shop's data to this computer failed (${error.message}). Nothing was changed online. Start the app again to retry.`);
    }
  } finally {
    await online.close();
  }
}

// Connects to the shop's database (see the top of this file).
// Gives up with a helpful error, so the app can tell the user what to check.
async function connectDB() {
  const configured = process.env.MONGO_URI || LOCAL_URI;

  if (isLocalDatabase(configured) || process.env.ALLOW_ONLINE_DATABASE === 'true') {
    await useDatabase(configured);
    console.log('Connected to MongoDB');
    if (!isLocalDatabase(configured)) {
      console.warn('WARNING: the shop\'s data is being saved ONLINE (ALLOW_ONLINE_DATABASE=true in server/.env).');
    }
    return;
  }

  // MONGO_URI is online, but the shop's data belongs on this computer.
  try {
    await useDatabase(LOCAL_URI, LOCAL_CHECK_OPTIONS);
  } catch (error) {
    console.warn('WARNING: MongoDB is not installed (or not running) on this computer, so the shop\'s data is still being saved ONLINE.');
    console.warn('Install MongoDB Community Server on this computer and start the app again: the data will be copied here automatically.');
    await mongoose.disconnect();
    await useDatabase(configured);
    console.log('Connected to MongoDB (online)');
    return;
  }

  console.log('Connected to MongoDB on this computer');
  await bringDataHere(mongoose.connection.db, configured, () => mongoose.createConnection(configured, CONNECT_OPTIONS).asPromise());
}

module.exports = connectDB;
module.exports.isLocalDatabase = isLocalDatabase;
module.exports.bringDataHere = bringDataHere;
module.exports.LOCAL_URI = LOCAL_URI;
