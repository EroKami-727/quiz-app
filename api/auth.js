// /api/auth.js - Corrected to use Vercel environment variables

import ImageKit from 'imagekit';

// === THIS IS THE FIX ===
// The initialization is now inside the handler and reads the correct variable names.
// This ensures that for every request, it checks the right environment variables.

export default function handler(req, res) {
  // Step 1: Add CORS Headers to every response
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Step 2: Handle the browser's "preflight" OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Step 3: Your existing logic, now with corrected variable access
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed. Use GET.' 
    });
  }

  try {
    // Read the variable names EXACTLY as they are in your Vercel settings.
    const PUBLIC_KEY = process.env.IMAGEKIT_PUBLIC_KEY_API;
    const PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY;
    const URL_ENDPOINT = process.env.IMAGEKIT_URL_ENDPOINT_API;

    // Validate that the variables were found.
    if (!PUBLIC_KEY || !PRIVATE_KEY || !URL_ENDPOINT) {
      console.error('SERVER ERROR: One or more ImageKit environment variables are missing or misnamed in Vercel settings.');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error: Missing ImageKit credentials.'
      });
    }

    // Initialize ImageKit with the correct, validated variables.
    const imagekit = new ImageKit({
        publicKey: PUBLIC_KEY,
        privateKey: PRIVATE_KEY,
        urlEndpoint: URL_ENDPOINT,
    });

    // Generate authentication parameters.
    const authenticationParameters = imagekit.getAuthenticationParameters();

    // Return the successful response.
    return res.status(200).json({
      success: true,
      ...authenticationParameters
    });

  } catch (error) {
    console.error('ImageKit authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate authentication parameters'
    });
  }
}