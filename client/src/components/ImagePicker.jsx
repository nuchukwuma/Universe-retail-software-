import { useState } from 'react';
import { api } from '../api/api';
import { resizeImage } from '../utils/resizeImage';

// Lets the user choose a picture (or take one on a phone), shrinks it,
// uploads it and then calls onChange(url) with its web address.
function ImagePicker({ value, onChange, placeholder = '📷' }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // Runs when a file is chosen.
  async function handleFileChosen(event) {
    const file = event.target.files[0];
    event.target.value = ''; // allows choosing the same file again
    if (!file) return;

    setError('');
    setUploading(true);
    try {
      const smallImage = await resizeImage(file);
      const formData = new FormData();
      formData.append('image', smallImage);
      const data = await api.upload('/uploads', formData);
      onChange(data.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="image-picker">
      <div className="image-picker-preview">
        {value ? <img src={value} alt="" /> : <span>{placeholder}</span>}
      </div>
      <div className="image-picker-buttons">
        <label className="btn btn-small">
          {uploading ? 'Uploading...' : value ? 'Change picture' : 'Choose picture'}
          <input type="file" accept="image/*" onChange={handleFileChosen} disabled={uploading} hidden />
        </label>
        {value && (
          <button type="button" className="btn btn-small btn-danger" onClick={() => onChange('')}>
            Remove
          </button>
        )}
        {error && <small className="text-error">{error}</small>}
      </div>
    </div>
  );
}

export default ImagePicker;
