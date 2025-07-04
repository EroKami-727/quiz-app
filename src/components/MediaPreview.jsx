import React, { useState, useEffect } from 'react';
import { FaCrop } from 'react-icons/fa';

// NOTE: The incorrect CSS import has been removed from this file.

const getCroppedUrl = (imageSrc, crop) => {
  return new Promise(resolve => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = imageSrc;
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = crop.width;
      canvas.height = crop.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
      resolve(canvas.toDataURL('image/jpeg'));
    };
    image.onerror = () => { resolve(imageSrc); };
  });
};

const MediaPreview = ({ file, cropData, onEdit }) => {
  const [previewUrl, setPreviewUrl] = useState('');
  const [fileType, setFileType] = useState('unknown');

  useEffect(() => {
    if (!file) { setPreviewUrl(''); return; }
    let isMounted = true;
    const isLocalFile = file instanceof File;
    let localUrl = isLocalFile ? URL.createObjectURL(file) : null;
    let displayUrl = isLocalFile ? localUrl : file.url;
    
    let determinedFileType = 'unknown';
    const source = file.name || file.url || '';
    if ((file.type && file.type.startsWith('image/')) || /\.(jpe?g|png|gif|webp|svg)$/i.test(source)) determinedFileType = 'image';
    else if ((file.type && file.type.startsWith('video/')) || /\.(mp4|webm|mov|ogg)$/i.test(source)) determinedFileType = 'video';
    else if ((file.type && file.type.startsWith('audio/')) || /\.(mp3|wav|aac|flac|m4a)$/i.test(source)) determinedFileType = 'audio';
    setFileType(determinedFileType);

    const setupUrls = async () => {
      if (isLocalFile && cropData?.pixels) {
        const croppedDataUrl = await getCroppedUrl(localUrl, cropData.pixels);
        if (isMounted) setPreviewUrl(croppedDataUrl);
      } else if (!isLocalFile && file.url && cropData?.pixels) {
        const { x, y, width, height, rotation } = cropData.pixels;
        let transformString = `x-${Math.round(x)},y-${Math.round(y)},w-${Math.round(width)},h-${Math.round(height)}`;
        if (rotation) {
            transformString += `,rt-${rotation}`
        }
        displayUrl = `${file.url}?tr=${transformString}`;
        if (isMounted) setPreviewUrl(displayUrl);
      } else {
        if (isMounted) setPreviewUrl(displayUrl);
      }
    };
    setupUrls();
    
    return () => { isMounted = false; if (localUrl) URL.revokeObjectURL(localUrl); };
  }, [file, cropData]);

  if (!previewUrl) return null;

  const renderMedia = () => {
    switch (fileType) {
      case 'image': return <img src={previewUrl} alt="Preview" className="media-preview-asset" />;
      case 'video': return <video controls src={file.url || previewUrl} className="media-preview-asset" />;
      case 'audio': return <audio controls src={file.url || previewUrl} style={{ width: '100%' }} />;
      default: return <p>Unsupported file</p>;
    }
  };

  const isEditable = onEdit && fileType === 'image';

  return (
    <div className={`media-preview-wrapper ${isEditable ? 'editable' : ''}`} onClick={isEditable ? onEdit : undefined}>
      {renderMedia()}
      {isEditable && (<div className="media-preview-edit-overlay"><FaCrop /><span>Edit Crop</span></div>)}
    </div>
  );
};

export default MediaPreview;