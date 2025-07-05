// /api/auth.js - Corrected to use a secure random token and Vercel environment variables

import ImageKit from 'imagekit';
// Import the built-in Node.js crypto module to generate a random token
import crypto from 'crypto';

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

    // === THE FIX IS HERE ===
    // Generate a truly random UUID to use as the token.
    const token = crypto.randomUUID();

    // Pass this unique token to the getAuthenticationParameters function.
    // This satisfies ImageKit's security requirement for high entropy.
    const authenticationParameters = imagekit.getAuthenticationParameters(token);

    // Return the successful response.
    // The success:true property is not part of the standard ImageKit response,
    // so it's better to return the object directly as the SDK intends.
    return res.status(200).json(authenticationParameters);

  } catch (error) {
    console.error('ImageKit authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate authentication parameters'
    });
  }
}