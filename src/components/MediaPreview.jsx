import React, { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import '../styles/Teacher/CreateQuiz.css'; // We'll add styles here

const MediaPreview = ({ file, onRemove }) => {
  const [previewUrl, setPreviewUrl] = useState('');
  const [fileType, setFileType] = useState('unknown');

  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      return;
    }

    const isLocalFile = !file.url;
    let url = isLocalFile ? URL.createObjectURL(file) : file.url;
    
    // Determine file type FIRST
    let determinedFileType = 'unknown';
    const source = file.name || file.url || '';
    if (file.fileType === 'image' || /\.(jpe?g|png|gif|webp|svg)$/i.test(source)) determinedFileType = 'image';
    else if (file.fileType === 'video' || /\.(mp4|webm|mov|ogg)$/i.test(source)) determinedFileType = 'video';
    else if (file.fileType === 'audio' || /\.(mp3|wav|aac|flac)$/i.test(source)) determinedFileType = 'audio';
    setFileType(determinedFileType);
    
    // Apply ImageKit transform ONLY to uploaded images
    if (!isLocalFile && determinedFileType === 'image') {
      // Transformation: width=300, height=200, crop-mode=at_max (fit inside box, no crop)
      url = `${file.url}?tr=w-300,h-200,c-at_max`;
    }
    
    setPreviewUrl(url);

    // This is the cleanup function. It runs when the component unmounts or the file changes.
    return () => {
      // If the URL was a temporary local one, revoke it to prevent memory leaks.
      if (isLocalFile) {
        URL.revokeObjectURL(url);
      }
    };
  }, [file]); // Dependency array ensures this effect re-runs only when the file changes.

  if (!previewUrl) return null;

  const renderMedia = () => {
    switch (fileType) {
      case 'image':
        return <img src={previewUrl} alt="Preview" className="media-preview-asset" />;
      case 'video':
        return <video controls src={previewUrl} className="media-preview-asset" />;
      case 'audio':
        return <audio controls src={previewUrl} style={{ width: '100%' }} />;
      default:
        return <p>Unsupported file</p>;
    }
  };

  return (
    <div className="media-preview-wrapper">
      {renderMedia()}
      {onRemove && (
        <button type="button" className="media-preview-remove-btn" onClick={onRemove}>
          <FaTimes />
        </button>
      )}
    </div>
  );
};

export default MediaPreview;