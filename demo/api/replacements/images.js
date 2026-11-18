// Demo pictures: kept in this browser, and shown straight from there
// (the picture's address is the picture itself, a data URL).
const { newId } = require('../../../server/db/ids');

const PREFIX = 'hd_demo_image:';
const MAX_CHARS = 2 * 1024 * 1024;
const DATA_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const cache = new Map();

function saveImage(dataUrl) {
  const text = String(dataUrl || '');
  const match = DATA_URL.exec(text);
  if (!match) throw new Error('That is not a picture the app can use. Choose a JPG, PNG or WebP photo.');
  if (text.length > MAX_CHARS) throw new Error('That picture is too big. Choose a smaller one.');
  const name = `${newId()}.${match[1] === 'jpeg' ? 'jpg' : match[1]}`;
  cache.set(name, text);
  try {
    localStorage.setItem(PREFIX + name, text);
  } catch {
    // kept for this visit only
  }
  return name;
}

function deleteImage(name) {
  if (!name) return;
  cache.delete(name);
  try {
    localStorage.removeItem(PREFIX + name);
  } catch {
    // nothing to tidy
  }
}

function imageUrl(name) {
  if (!name) return '';
  if (!cache.has(name)) {
    try {
      const saved = localStorage.getItem(PREFIX + name);
      if (saved) cache.set(name, saved);
    } catch {
      // not available
    }
  }
  return cache.get(name) || '';
}

const imagePath = () => null;
const imagesFolder = () => '/demo/images';

module.exports = { saveImage, deleteImage, imagePath, imageUrl, imagesFolder, PREFIX };
