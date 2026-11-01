const dns = require('dns');
const mongoose = require('mongoose');

// The database on this computer, unless MONGO_URI in .env says otherwise.
const DEFAULT_URI = 'mongodb://127.0.0.1:27017/universe_pos';

// Public DNS servers (Cloudflare and Google), used when the computer's own
// DNS refuses the special lookup that Atlas addresses need.
const PUBLIC_DNS_SERVERS = ['1.1.1.1', '8.8.8.8'];

const CONNECT_OPTIONS = { serverSelectionTimeoutMS: 10000 };

// True if the database address is on this computer (so the shop's data
// never leaves it). Atlas (mongodb+srv://) and other computers are online.
function isLocalDatabase(uri = process.env.MONGO_URI || DEFAULT_URI) {
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

// Connects to MongoDB. Gives up after 10 seconds and throws a helpful
// error, so the app can tell the user what to check.
async function connectDB() {
  const uri = process.env.MONGO_URI || DEFAULT_URI;
  try {
    await mongoose.connect(uri, CONNECT_OPTIONS);
  } catch (error) {
    // Atlas addresses (mongodb+srv://) start with a special DNS lookup
    // ("querySrv"). Some routers and Windows set-ups refuse it, so try
    // once more using public DNS servers.
    if (!uri.startsWith('mongodb+srv://') || !/querySrv|queryTxt/.test(error.message)) {
      throw new Error(`Could not connect to MongoDB (${error.message}). ${connectionHelp(uri)}`);
    }
    console.warn(`The DNS lookup for MongoDB Atlas failed (${error.message}). Trying again with public DNS servers ${PUBLIC_DNS_SERVERS.join(', ')}...`);
    dns.setServers(PUBLIC_DNS_SERVERS);
    try {
      await mongoose.connect(uri, CONNECT_OPTIONS);
    } catch (retryError) {
      throw new Error(`Could not connect to MongoDB (${retryError.message}). ${connectionHelp(uri)}`);
    }
  }
  console.log('Connected to MongoDB');
  if (!isLocalDatabase(uri)) {
    console.warn('WARNING: the shop\'s data is being saved ONLINE (MONGO_URI points to another computer or MongoDB Atlas), not on this computer.');
    console.warn('To keep everything offline, install MongoDB on this computer and set MONGO_URI=mongodb://127.0.0.1:27017/universe_pos in server/.env');
  }
}

module.exports = connectDB;
module.exports.isLocalDatabase = isLocalDatabase;
