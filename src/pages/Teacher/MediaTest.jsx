import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ImageKit from 'imagekit-javascript';

const MediaTest = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  // Function to get the appropriate API URL based on the environment
  const getApiUrl = () => {
    // Check if we have a custom API URL in environment variables (for teammates using external URL)
    const customApiUrl = import.meta.env.VITE_API_URL;
    
    if (customApiUrl) {
      // Use the custom API URL (production/preview URL)
      return `${customApiUrl}/api/auth`;
    }
    
    // Default to relative path (works with vercel dev and production)
    return '/api/auth';
  };

  // Function to fetch authentication parameters from our secure backend
  const getAuthParams = async () => {
    try {
      const apiUrl = getApiUrl();
      console.log('Fetching auth params from:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to get authentication parameters');
      }

      return {
        signature: data.signature,
        expire: data.expire,
        token: data.token,
        publicKey: data.publicKey,
        urlEndpoint: data.urlEndpoint
      };
    } catch (error) {
      console.error('Error fetching auth params:', error);
      throw new Error(`Authentication failed: ${error.message}`);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setError('');
      setUploadedFile(null);
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
      // Get authentication parameters from our secure backend
      const authParams = await getAuthParams();
      
      // Initialize ImageKit with the authentication parameters (no private key!)
      const imagekit = new ImageKit({
        publicKey: authParams.publicKey,
        urlEndpoint: authParams.urlEndpoint,
        authenticationEndpoint: getApiUrl(), // Use our secure endpoint
      });

      const fileName = `test_${Date.now()}_${selectedFile.name}`;
      
      // Upload the file using ImageKit
      const result = await imagekit.upload({
        file: selectedFile,
        fileName: fileName,
        folder: '/quiz-app-media-test',
        // Use the authentication parameters we got from the backend
        signature: authParams.signature,
        expire: authParams.expire,
        token: authParams.token,
      }, {
        // Progress callback
        onUploadProgress: (progress) => {
          const percentComplete = Math.round((progress.loaded / progress.total) * 100);
          setUploadProgress(percentComplete);
        }
      });
      
      setUploadedFile(result);
      setUploadProgress(100);
      console.log('Upload successful:', result);
      
    } catch (error) {
      console.error('Upload error:', error);
      setError(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!uploadedFile) return;

    try {
      // Get fresh authentication parameters for the delete operation
      const authParams = await getAuthParams();
      
      // Initialize ImageKit for the delete operation
      const imagekit = new ImageKit({
        publicKey: authParams.publicKey,
        urlEndpoint: authParams.urlEndpoint,
        authenticationEndpoint: getApiUrl(),
      });

      await imagekit.deleteFile(uploadedFile.fileId);
      setUploadedFile(null);
      setSelectedFile(null);
      // Reset the file input field
      document.querySelector('input[type="file"]').value = '';
      console.log('File deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      setError(`Delete failed: ${error.message}`);
    }
  };

  const getFileType = (file) => {
    if (!file) return 'unknown';

    // Check for ImageKit's explicit fileType property
    if (file.fileType === 'image' || file.fileType === 'video' || file.fileType === 'audio') {
        return file.fileType;
    }

    // Fallback: Check the file's name or URL for an extension
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

    // Check the MIME type
    const mimeType = file.type || '';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';

    return 'unknown';
  };

  const renderPreview = (file) => {
    const fileType = getFileType(file);
    const url = file.url || URL.createObjectURL(file);

    switch (fileType) {
      case 'image':
        return (
          <img 
            src={url} 
            alt="Content preview" 
            style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }}
            onLoad={() => { if (!file.url) URL.revokeObjectURL(url) }}
          />
        );
      case 'video':
        return (
          <video 
            controls 
            style={{ maxWidth: '100%', maxHeight: '300px' }}
            onCanPlay={() => { if (!file.url) URL.revokeObjectURL(url) }}
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
        <h1 style={{ margin: 0 }}>🔐 Secure ImageKit Media Test</h1>
        <button onClick={() => navigate('/teacher/home')} style={{ padding: '8px 16px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          ← Back to Dashboard
        </button>
      </div>

      {/* API URL Info */}
      <div style={{ backgroundColor: '#e7f3ff', color: '#0c5460', padding: '12px', borderRadius: '4px', marginBottom: '20px', border: '1px solid #bee5eb', fontSize: '14px' }}>
        <strong>🔗 API Endpoint:</strong> {getApiUrl()}
        <br />
        <small>
          {import.meta.env.VITE_API_URL ? 
            '(Using custom API URL from VITE_API_URL)' : 
            '(Using relative path - works with vercel dev and production)'
          }
        </small>
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
          {isUploading ? `Uploading...` : '🔐 Secure Upload to ImageKit'}
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
          ❌ {error}
        </div>
      )}

      {uploadedFile && (
        <div style={{ backgroundColor: '#d4edda', color: '#155724', padding: '20px', borderRadius: '8px', border: '1px solid #c3e6cb', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0 }}>✅ Secure Upload Successful!</h3>
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
        <h4 style={{ marginTop: 0 }}>🔐 Secure Upload Test Instructions:</h4>
        <ol style={{ paddingLeft: '20px' }}>
          <li>Select an image, video, or audio file. You will see a local preview.</li>
          <li>Click "🔐 Secure Upload to ImageKit" to start the secure upload process.</li>
          <li>The app will fetch authentication parameters from the secure backend API.</li>
          <li>After a successful upload, you will see the file details and a preview from ImageKit.</li>
          <li>Optionally, click "Delete File" to remove it from your ImageKit account.</li>
        </ol>
        <p style={{ marginBottom: 0, fontWeight: 'bold', color: '#28a745' }}>
          ✅ No private keys are exposed to the client-side!
        </p>
      </div>
    </div>
  );
};

export default MediaTest;