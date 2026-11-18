// Pictures: product photos and the shop's logo. They are optional.
// The app sends a picture already made small (see the client), as a
// "data:image/...;base64,..." text. It is saved as a file in the "images"
// folder of the app's data folder, and shown at /api/images/<name>.
const fs = require('fs');
const path = require('path');
const { dataDir, makeFolder } = require('./paths');
const { newId } = require('../db/ids');

const MAX_BYTES = 1.5 * 1024 * 1024; // 1.5 MB is plenty for a small photo
const NAME_PATTERN = /^[0-9a-f]{24}\.(png|jpg|webp)$/;
const DATA_URL = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/;

// The folder the pictures are kept in.
function imagesFolder() {
  return path.join(dataDir(), 'images');
}

// Saves a picture sent by the app. Returns its file name.
// Throws a message the app can show if it is not a usable picture.
function saveImage(dataUrl) {
  const match = DATA_URL.exec(String(dataUrl || ''));
  if (!match) throw new Error('That is not a picture the app can use. Choose a JPG, PNG or WebP photo.');
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length > MAX_BYTES) throw new Error('That picture is too big. Choose a smaller one.');
  const name = `${newId()}.${match[1] === 'jpeg' ? 'jpg' : match[1]}`;
  makeFolder(imagesFolder());
  fs.writeFileSync(path.join(imagesFolder(), name), bytes);
  return name;
}

// The full path of a saved picture, or null if the name is not one of ours.
function imagePath(name) {
  return NAME_PATTERN.test(String(name || '')) ? path.join(imagesFolder(), name) : null;
}

// Deletes a picture that is no longer used (a missing file is fine).
function deleteImage(name) {
  const file = imagePath(name);
  if (!file) return;
  try {
    fs.unlinkSync(file);
  } catch (error) {
    if (error.code !== 'ENOENT') console.warn(`Could not delete the picture ${name}: ${error.message}`);
  }
}

// The address the app shows a picture from ('' when there is none).
function imageUrl(name) {
  return name ? `/api/images/${name}` : '';
}

module.exports = { saveImage, deleteImage, imagePath, imageUrl, imagesFolder };
