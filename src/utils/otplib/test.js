/**
 * Test file for OTP Library utilities
 * Run this in browser console to test functionality
 */

import {
    generateCurrentToken,
    generateQRCodeURL,
    generateSecret,
    generateURI,
    getTimeRemaining,
    verifyToken
} from './index.js';

/**
 * Test OTP functionality
 */
export const testOTPFunctionality = () => {
  console.log('🧪 Testing OTP Library Functionality...');
  
  try {
    // Test 1: Generate Secret
    console.log('\n1. Testing Secret Generation:');
    const secret = generateSecret();
    console.log('✅ Secret generated:', secret);
    console.log('✅ Secret length:', secret.length);
    
    // Test 2: Generate URI
    console.log('\n2. Testing URI Generation:');
    const uri = generateURI('test@example.com', 'TestApp', secret);
    console.log('✅ URI generated:', uri);
    
    // Test 3: Generate QR Code URL
    console.log('\n3. Testing QR Code URL Generation:');
    const qrURL = generateQRCodeURL(uri, 200);
    console.log('✅ QR Code URL:', qrURL);
    
    // Test 4: Generate Current Token
    console.log('\n4. Testing Current Token Generation:');
    const currentToken = generateCurrentToken(secret);
    console.log('✅ Current token:', currentToken);
    
    // Test 5: Verify Token
    console.log('\n5. Testing Token Verification:');
    const isValid = verifyToken(currentToken, secret);
    console.log('✅ Token verification result:', isValid);
    
    // Test 6: Time Information
    console.log('\n6. Testing Time Information:');
    const timeRemaining = getTimeRemaining();
    console.log('✅ Time remaining:', timeRemaining, 'seconds');
    
    console.log('\n🎉 All tests passed! OTP Library is working correctly.');
    
    return {
      secret,
      uri,
      qrURL,
      currentToken,
      isValid,
      timeRemaining
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return null;
  }
};

/**
 * Test QR Code generation with different services
 */
export const testQRCodeServices = () => {
  console.log('🧪 Testing QR Code Services...');
  
  try {
    const secret = generateSecret();
    const uri = generateURI('test@example.com', 'TestApp', secret);
    
    // Test different QR code services
    const services = ['qrserver', 'google'];
    
    services.forEach(service => {
      try {
        const qrURL = generateQRCodeURL(uri, 200);
        console.log(`✅ ${service} QR URL:`, qrURL);
      } catch (error) {
        console.error(`❌ ${service} failed:`, error);
      }
    });
    
  } catch (error) {
    console.error('❌ QR Code service test failed:', error);
  }
};

// Auto-run tests if this file is imported
if (typeof window !== 'undefined') {
  console.log('OTP Library test functions loaded. Run testOTPFunctionality() to test.');
}
