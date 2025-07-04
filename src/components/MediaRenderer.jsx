import React from 'react';
import { PhotoView } from 'react-photo-view';

// Note: We remove the direct CSS import from here. Styles will be handled by the page that uses this component.

const MediaRenderer = ({ media, transform, className }) => {
  if (!media || !media.url) {
    return null;
  }

  const getMediaType = () => {
    if (media.fileType && ['image', 'video', 'audio'].includes(media.fileType)) {
      return media.fileType;
    }
    const url = media.url.toLowerCase();
    if (/\.(jpe?g|png|gif|webp|svg)$/.test(url)) return 'image';
    if (/\.(mp4|webm|mov|ogg)$/.test(url)) return 'video';
    if (/\.(mp3|wav|aac|flac|m4a)$/.test(url)) return 'audio';
    return 'unknown';
  };

  const mediaType = getMediaType();

  let finalUrl = media.url;
  // Apply inline transformation ONLY to uploaded images from ImageKit
  if (mediaType === 'image' && media.url.includes('imagekit.io')) {
    let transformString = 'q-auto,f-auto'; // Always optimize quality and format
    if (transform === 'thumbnail') {
      transformString += ',w-160,h-120,c-at_max'; // Fit inside 160x120 box
    } else if (transform === 'question_main') {
      transformString += ',w-800'; // Set max-width to 800px, auto height
    }
    finalUrl = `${media.url}?tr=${transformString}`;
  }


  switch (mediaType) {
    case 'image':
      return (
        // PhotoView uses the original, high-res URL for zooming
        <PhotoView src={media.url}>
          <img src={finalUrl} alt="Quiz media" className={`question-media-asset zoomable ${className || ''}`} />
        </PhotoView>
      );
    case 'video':
      return <video controls src={finalUrl} className={`question-media-asset ${className || ''}`} />;
    case 'audio':
      return <audio controls src={finalUrl} className={`question-media-asset audio ${className || ''}`} />;
    default:
      return null;
  }
};

export default MediaRenderer;