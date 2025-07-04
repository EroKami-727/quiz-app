import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { FaSave, FaTimes, FaTrashAlt } from 'react-icons/fa';

// NOTE: The incorrect CSS import has been removed from this file.

const ImageCropperModal = ({ imageSrc, onCropComplete, onClose, onDelete, initialCropData }) => {
  const [crop, setCrop] = useState(initialCropData?.pixels ? { x: initialCropData.pixels.x, y: initialCropData.pixels.y } : { x: 0, y: 0 });
  const [zoom, setZoom] = useState(initialCropData?.zoom || 1);
  const [rotation, setRotation] = useState(initialCropData?.rotation || 0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropChange = useCallback((location) => { setCrop(location); }, []);
  const onZoomChange = useCallback((zoomValue) => { setZoom(zoomValue); }, []);
  const onRotationChange = useCallback((rotationValue) => { setRotation(rotationValue); }, []);
  const onCropDataChange = useCallback((croppedArea, croppedAreaPixelsValue) => {
    setCroppedAreaPixels(croppedAreaPixelsValue);
  }, []);

  const handleConfirmCrop = () => {
    if (croppedAreaPixels) {
      onCropComplete(croppedAreaPixels, rotation, zoom);
    }
  };

  return (
    <div className="cropper-modal-overlay">
      <div className="cropper-modal-content">
        <div className="cropper-container">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={4 / 3}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onRotationChange={onRotationChange}
            onCropComplete={onCropDataChange}
            initialCroppedAreaPixels={initialCropData?.pixels}
          />
        </div>
        <div className="cropper-controls">
          <div className="control-group">
            <label>Zoom</label>
            <input type="range" value={zoom} min={1} max={3} step={0.1} aria-labelledby="Zoom" onChange={(e) => onZoomChange(Number(e.target.value))} />
          </div>
          <div className="control-group">
            <label>Rotation</label>
            <input type="range" value={rotation} min={-180} max={180} step={1} aria-labelledby="Rotation" onChange={(e) => onRotationChange(Number(e.target.value))} />
          </div>
        </div>
        <div className="cropper-actions">
          <button className="cropper-btn-delete" onClick={onDelete}><FaTrashAlt /> Delete</button>
          <div className="cropper-actions-right">
            <button className="cropper-btn-cancel" onClick={onClose}><FaTimes /> Cancel</button>
            <button className="cropper-btn-confirm" onClick={handleConfirmCrop}><FaSave /> Confirm Crop</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCropperModal;