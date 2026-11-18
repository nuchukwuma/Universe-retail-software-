import { useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { resizeImage } from '../utils/resizeImage';

// A picture box: shows the picture (or "fallback"), with Choose and Remove.
// "value" is a URL or data URL ('' = none); onChange(dataUrl or '').
function PictureField({ id, label, value, onChange, fallback, maxSize = 640 }) {
  const fileRef = useRef(null);
  const [error, setError] = useState('');

  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      setError('');
      onChange(await resizeImage(file, maxSize));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="field picture-field">
      <span className="field-label" id={`${id}-label`}>{label}</span>
      <div className="picture-row">
        <div className="picture-preview">
          {value ? <img src={value} alt="" /> : fallback}
        </div>
        <div className="btn-row">
          <input ref={fileRef} id={id} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFile} hidden />
          <button type="button" className="btn btn-small" onClick={() => fileRef.current?.click()} aria-describedby={`${id}-label`}>
            <ImagePlus size={16} aria-hidden="true" /> {value ? 'Change' : 'Choose picture'}
          </button>
          {value && (
            <button type="button" className="btn btn-small btn-quiet btn-danger" onClick={() => onChange('')}>
              <Trash2 size={16} aria-hidden="true" /> Remove
            </button>
          )}
        </div>
      </div>
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}

export default PictureField;
