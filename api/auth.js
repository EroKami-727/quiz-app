// /api/auth.js - Vercel Serverless Function with CORS fix

import ImageKit from 'imagekit';

// Initialize ImageKit once outside the handler for better performance.
// The serverless function will reuse this instance across requests.
const imagekit = new ImageKit({
  publicKey: process.env.PUBLIC_KEY,
  privateKey: process.env.PRIVATE_KEY,
  urlEndpoint: process.env.URL_ENDPOINT,
});


export default function handler(req, res) {
  // =================================================================
  // Step 1: Add CORS Headers to every response
  // This tells the browser that requests from any origin are allowed.
  // =================================================================
  res.setHeader('Access-Control-Allow-Origin', '*'); // For production, you might want to restrict this to your domain: 'https://quizzit-erokami.vercel.app'
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // =================================================================
  // Step 2: Handle the browser's "preflight" OPTIONS request
  // This is a check the browser sends before the actual GET request.
  // =================================================================
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // =================================================================
  // Step 3: Your existing logic
  // =================================================================
  
  // Only allow GET requests for the actual data fetching
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed. Use GET.' 
    });
  }

  try {
    // Validate that all required environment variables are present
    if (!process.env.PUBLIC_KEY || !process.env.PRIVATE_KEY || !process.env.URL_ENDPOINT) {
      console.error('SERVER ERROR: Missing ImageKit environment variables on Vercel.');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error: Missing ImageKit credentials.'
      });
    }

    // Generate authentication parameters
    const authenticationParameters = imagekit.getAuthenticationParameters();

    // Return the authentication parameters (no private key exposed)
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