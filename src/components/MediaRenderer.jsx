import React, { useState, useEffect } from 'react';

const MediaRenderer = ({ media, className }) => {
  if (!media || !media.url) {
    return null;
  }

  const [mediaType, setMediaType] = useState('unknown');

  useEffect(() => {
    let type = 'unknown';
    // Prioritize the explicit fileType from ImageKit
    if (media.fileType === 'image' || media.fileType === 'video' || media.fileType === 'audio') {
      type = media.fileType;
    } else {
      // Fallback to checking the URL extension
      const url = media.url.toLowerCase();
      if (/\.(jpe?g|png|gif|webp|svg)$/.test(url)) type = 'image';
      else if (/\.(mp4|webm|mov|ogg)$/.test(url)) type = 'video';
      else if (/\.(mp3|wav|aac|flac|m4a)$/.test(url)) type = 'audio';
    }
    setMediaType(type);
  }, [media]);


  switch (mediaType) {
    case 'image':
      return <img src={media.url} alt="Quiz media" className={`question-media-asset ${className || ''}`} />;
    case 'video':
      return <video controls src={media.url} className={`question-media-asset ${className || ''}`} />;
    case 'audio':
      return <audio controls src={media.url} className={`question-media-asset audio ${className || ''}`} />;
    default:
      console.warn("Unsupported media type for URL:", media.url);
      return null;
  }
};

export default MediaRenderer;