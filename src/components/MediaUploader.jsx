import React, { useState } from 'react';
import ImageKit from 'imagekit-javascript';

// Initialize the SDK once with your public keys.
const imagekit = new ImageKit({
  publicKey: import.meta.env.VITE_PUBLIC_KEY,
  urlEndpoint: import.meta.env.VITE_URL_ENDPOINT,
});

const MediaUploader = ({ onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setError('');
    setUploadProgress(0);

    try {
      const authApiUrl = `${import.meta.env.VITE_API_URL || ''}/api/auth`;
      const response = await fetch(authApiUrl);
      if (!response.ok) throw new Error(`Auth server failed: ${response.status}`);
      const authParams = await response.json();

      const result = await imagekit.upload({
        file: selectedFile,
        fileName: `quiz-media_${Date.now()}_${selectedFile.name}`,
        folder: '/quiz-app-media',
        signature: authParams.signature,
        expire: authParams.expire,
        token: authParams.token,
        onUploadProgress: (progress) => {
          setUploadProgress(Math.round((progress.loaded / progress.total) * 100));
        }
      });
      
      // Call the callback with the successful result
      onUploadSuccess({
        url: result.url,
        fileId: result.fileId,
        fileType: result.fileType,
      });

    } catch (err) {
      console.error('Upload error:', err);
      setError(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="media-uploader">
      <h4>Upload Media</h4>
      <p>Select an image, video, or audio file.</p>
      <input type="file" accept="image/*,video/*,audio/*" onChange={handleFileSelect} />
      {selectedFile && <p>Selected: {selectedFile.name}</p>}
      <button onClick={handleUpload} disabled={!selectedFile || isUploading}>
        {isUploading ? `Uploading ${uploadProgress}%...` : 'Upload Now'}
      </button>
      {error && <div className="uploader-error">{error}</div>}
    </div>
  );
};

export default MediaUploader;