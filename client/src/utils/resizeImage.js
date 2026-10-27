// Shrinks a photo so its longest side is at most "maxSize" pixels and
// returns it as a JPEG file. Phone photos can be 5 MB; this makes them
// around 50 KB, so the product grid loads quickly.
export function resizeImage(file, maxSize = 600) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);

      const context = canvas.getContext('2d');
      context.fillStyle = '#ffffff'; // white background for transparent PNGs
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      canvas.toBlob(
        (blob) => (blob ? resolve(new File([blob], 'image.jpg', { type: 'image/jpeg' })) : reject(new Error('Could not read image.'))),
        'image/jpeg',
        0.85
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That file is not a picture we can read.'));
    };

    image.src = url;
  });
}
