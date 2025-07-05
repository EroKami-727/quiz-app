// /api/auth.js - Final version with ultra-unique token generation

import ImageKit from 'imagekit';
import crypto from 'crypto';

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY_API,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT_API,
});

export default function handler(req, res) {
  // Set CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed. Use GET.' 
    });
  }

  try {
    const PUBLIC_KEY = process.env.IMAGEKIT_PUBLIC_KEY_API;
    const PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY;
    const URL_ENDPOINT = process.env.IMAGEKIT_URL_ENDPOINT_API;

    if (!PUBLIC_KEY || !PRIVATE_KEY || !URL_ENDPOINT) {
      console.error('SERVER ERROR: One or more ImageKit environment variables are missing.');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error: Missing ImageKit credentials.'
      });
    }

    // === THE DEFINITIVE FIX IS HERE ===
    // We combine a high-resolution timestamp with a random UUID.
    // This creates a token that is guaranteed to be unique for every single invocation,
    // defeating any potential server caching or instance reuse issues.
    const uniqueToken = `${crypto.randomUUID()}-${Date.now()}`;

    // Pass this ultra-unique token to the SDK.
    const authenticationParameters = imagekit.getAuthenticationParameters(uniqueToken);
    
    // Return the successful response.
    return res.status(200).json(authenticationParameters);

  } catch (error) {
    console.error('ImageKit authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate authentication parameters'
    });
  }
}