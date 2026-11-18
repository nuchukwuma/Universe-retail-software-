// Reads a picture the user chose and makes it small enough to keep:
// at most "maxSize" pixels wide or high. PNG stays PNG (a logo may be
// see-through); anything else becomes JPEG. Answers a data URL.
export function resizeImage(file, maxSize = 640) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpeg|webp|gif|bmp)$/.test(file.type)) {
      reject(new Error('Choose a picture (PNG, JPEG or WebP).'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('The picture could not be read.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('The picture could not be opened.'));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        const png = file.type === 'image/png';
        if (!png) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(png ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
