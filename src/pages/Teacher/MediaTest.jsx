import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ImageKit from 'imagekit';

const MediaTest = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  // Initialize ImageKit with your credentials
  // WARNING: Exposing your private key on the client-side is a major security risk.
  // This should be handled by a backend server in a real production application.
  const imagekit = new ImageKit({
    publicKey: import.meta.env.VITE_PUBLIC_KEY || 'public_S7odQQNJQ6GFkz0nI0LUViCdWZ0=',
    urlEndpoint: import.meta.env.VITE_URL_ENDPOINT || 'https://ik.imagekit.io/eqcotiqjq',
    privateKey: import.meta.env.VITE_PRIVATE_KEY || 'private_DbCuICv2BtsPmzMRd6cXQHjPxIg='
  });

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setError('');
      setUploadedFile(null);
      // Also render a local preview immediately
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    setIsUploading(true);
    setError('');
    setUploadProgress(0);

    try {
      const fileName = `test_${Date.now()}_${selectedFile.name}`;
      
      const fileReader = new FileReader();
      
      fileReader.onload = async (event) => {
        try {
          const base64 = event.target.result;
          
          const result = await imagekit.upload({
            file: base64,
            fileName: fileName,
            folder: '/quiz-app-media-test'
          });
          
          setUploadedFile(result);
          setUploadProgress(100);
          console.log('Upload successful:', result);
        } catch (uploadError) {
          console.error('Upload error:', uploadError);
          setError(`Upload failed: ${uploadError.message}`);
        } finally {
          setIsUploading(false);
        }
      };

      fileReader.onerror = () => {
        setError('Error reading file');
        setIsUploading(false);
      };
      
      // Simulate progress for base64 upload
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress = Math.min(progress + 10, 90);
        setUploadProgress(progress);
        if (progress >= 90) {
            clearInterval(progressInterval);
        }
      }, 150);

      fileReader.readAsDataURL(selectedFile);
      
    } catch (error) {
      console.error('Error:', error);
      setError(`Error: ${error.message}`);
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!uploadedFile) return;

    try {
      await imagekit.deleteFile(uploadedFile.fileId);
      setUploadedFile(null);
      setSelectedFile(null);
      // Reset the file input field so the user can select the same file again
      document.querySelector('input[type="file"]').value = '';
      console.log('File deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      setError(`Delete failed: ${error.message}`);
    }
  };

  // ==================================================================
  // FIXED FUNCTION: This is the updated, more robust getFileType function.
  // It now checks the file extension in the name/URL as a fallback.
  // ==================================================================
  const getFileType = (file) => {
    if (!file) return 'unknown';

    // 1. Check for ImageKit's explicit fileType property (if available)
    if (file.fileType === 'image' || file.fileType === 'video' || file.fileType === 'audio') {
        return file.fileType;
    }

    // 2. Fallback: Check the file's name or URL for an extension.
    // This is the key fix for the post-upload preview.
    const source = file.name || file.url || '';
    if (/\.(jpe?g|png|gif|webp|svg)$/i.test(source)) {
        return 'image';
    }
    if (/\.(mp4|webm|mov|ogg)$/i.test(source)) {
        return 'video';
    }
    if (/\.(mp3|wav|aac|flac)$/i.test(source)) {
        return 'audio';
    }

    // 3. Last resort: Check the MIME type (useful for the local pre-upload preview)
    const mimeType = file.type || '';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';

    return 'unknown';
  };

  const renderPreview = (file) => {
    const fileType = getFileType(file);
    // For local files (before upload), create a temporary URL. For uploaded files, use the ImageKit URL.
    const url = file.url || URL.createObjectURL(file);

    switch (fileType) {
      case 'image':
        return (
          <img 
            src={url} 
            alt="Content preview" 
            style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }}
            onLoad={() => { if (!file.url) URL.revokeObjectURL(url) }} // Clean up local URL
          />
        );
      case 'video':
        return (
          <video 
            controls 
            style={{ maxWidth: '100%', maxHeight: '300px' }}
            onCanPlay={() => { if (!file.url) URL.revokeObjectURL(url) }} // Clean up local URL
          >
            <source src={url} type={file.type || file.fileType} />
            Your browser does not support video playback.
          </video>
        );
      case 'audio':
        return (
          <audio controls style={{ width: '100%' }} onCanPlay={() => { if (!file.url) URL.revokeObjectURL(url) }}>
            <source src={url} type={file.type || file.fileType} />
            Your browser does not support audio playback.
          </audio>
        );
      default:
        return <p style={{color: '#888'}}>File type not supported for preview</p>;
    }
  };

  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      color: '#333'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '2px solid #eee', paddingBottom: '15px' }}>
        <h1 style={{ margin: 0 }}>ImageKit Media Test</h1>
        <button onClick={() => navigate('/teacher/home')} style={{ padding: '8px 16px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          ← Back to Dashboard
        </button>
      </div>

      <div style={{ border: '2px dashed #ddd', borderRadius: '8px', padding: '20px', textAlign: 'center', marginBottom: '20px', backgroundColor: '#fafafa' }}>
        <h3>Upload Media File</h3>
        <input type="file" accept="image/*,video/*,audio/*" onChange={handleFileSelect} style={{ marginBottom: '15px' }} />
        
        {selectedFile && !uploadedFile && (
            <div style={{ marginBottom: '15px' }}>
              <p><strong>Selected:</strong> {selectedFile.name}</p>
              <div style={{ border: '1px solid #ccc', padding: '10px', marginTop: '10px', backgroundColor: '#fff' }}>
                <h4>Local Preview:</h4>
                {renderPreview(selectedFile)}
              </div>
            </div>
        )}

        <button onClick={handleUpload} disabled={!selectedFile || isUploading} style={{ padding: '10px 20px', backgroundColor: isUploading ? '#ccc' : '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: isUploading ? 'not-allowed' : 'pointer', fontSize: '16px' }}>
          {isUploading ? `Uploading...` : 'Upload to ImageKit'}
        </button>

        {isUploading && (
          <div style={{ marginTop: '10px' }}>
            <div style={{ width: '100%', backgroundColor: '#e0e0e0', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${uploadProgress}%`, height: '8px', backgroundColor: '#007bff', transition: 'width 0.3s ease' }} />
            </div>
            <p style={{ margin: '5px 0' }}>{uploadProgress}%</p>
          </div>
        )}
      </div>

      {error && (
        <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '12px', borderRadius: '4px', marginBottom: '20px', border: '1px solid #f5c6cb' }}>
          {error}
        </div>
      )}

      {uploadedFile && (
        <div style={{ backgroundColor: '#d4edda', color: '#155724', padding: '20px', borderRadius: '8px', border: '1px solid #c3e6cb', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0 }}>✅ Upload Successful!</h3>
            <button onClick={handleDelete} style={{ padding: '6px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Delete File
            </button>
          </div>

          <div style={{ marginBottom: '15px', fontSize: '14px', wordBreak: 'break-all' }}>
            <p><strong>File ID:</strong> {uploadedFile.fileId}</p>
            <p><strong>File Name:</strong> {uploadedFile.name}</p>
            <p><strong>URL:</strong> <a href={uploadedFile.url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', fontWeight: 'bold' }}>{uploadedFile.url}</a></p>
            <p><strong>Size:</strong> {uploadedFile.size ? (uploadedFile.size / 1024).toFixed(2) + ' KB' : 'N/A'}</p>
          </div>

          <div style={{ border: '1px solid #c3e6cb', borderRadius: '4px', padding: '15px', backgroundColor: '#ffffff', textAlign: 'center' }}>
            <h4 style={{ marginTop: 0, marginBottom: '15px' }}>Preview from ImageKit:</h4>
            {renderPreview(uploadedFile)}
          </div>
        </div>
      )}

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f8f9fa', color: '#343a40', border: '1px solid #dee2e6', borderRadius: '4px', fontSize: '14px', lineHeight: '1.5' }}>
        <h4 style={{ marginTop: 0 }}>How to test:</h4>
        <ol style={{ paddingLeft: '20px' }}>
          <li>Select an image, video, or audio file. You will see a local preview.</li>
          <li>Click "Upload to ImageKit" to start the upload.</li>
          <li>After a successful upload, you will see the file details and a new preview rendered directly from the ImageKit URL.</li>
          <li>Optionally, click "Delete File" to remove it from your ImageKit account.</li>
        </ol>
      </div>
    </div>
  );
};

export default MediaTest;