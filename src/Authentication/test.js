/**
 * Test file for Authentication Module
 * Run this in browser console to test functionality
 */

import {
    completeAdmin2FASetup,
    disableAdmin2FA,
    generateCurrentToken,
    generateQRCodeURL,
    generateSecret,
    generateTOTPURI,
    getTimeRemaining,
    isAdmin2FAEnabled,
    mfaManager,
    setupComplete2FA,
    verifyAdmin2FA,
    verifyToken
} from './index.js';

/**
 * Test complete 2FA setup flow
 */
export const testComplete2FAFlow = async () => {
  console.log('🧪 Testing Complete 2FA Flow...');
  
  try {
    const testAdminId = 'test-admin-123';
    const testAccountName = 'test@example.com';
    const testServiceName = 'Test App';
    
    // Test 1: Setup 2FA
    console.log('\n1. Testing 2FA Setup:');
    const setupResult = await setupComplete2FA(testAdminId, testAccountName, testServiceName);
    console.log('✅ Setup result:', setupResult);
    
    if (setupResult.success) {
      // Test 2: Generate current token
      console.log('\n2. Testing Token Generation:');
      const currentToken = generateCurrentToken(setupResult.secret);
      console.log('✅ Current token:', currentToken);
      
      // Test 3: Verify token
      console.log('\n3. Testing Token Verification:');
      const isValid = await verifyAdmin2FA(testAdminId, currentToken);
      console.log('✅ Token verification result:', isValid);
      
      // Test 4: Complete setup
      if (isValid) {
        console.log('\n4. Testing Setup Completion:');
        const completed = await completeAdmin2FASetup(testAdminId, currentToken);
        console.log('✅ Setup completion result:', completed);
        
        // Test 5: Check if enabled
        console.log('\n5. Testing 2FA Status Check:');
        const isEnabled = await isAdmin2FAEnabled(testAdminId);
        console.log('✅ 2FA enabled status:', isEnabled);
        
        // Test 6: Disable 2FA
        console.log('\n6. Testing 2FA Disable:');
        const disabled = await disableAdmin2FA(testAdminId);
        console.log('✅ 2FA disable result:', disabled);
      }
    }
    
    console.log('\n🎉 Complete 2FA flow test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

/**
 * Test MFA Manager functionality
 */
export const testMFAManager = () => {
  console.log('🧪 Testing MFA Manager...');
  
  try {
    // Test 1: Initialize 2FA
    console.log('\n1. Testing MFA Manager Initialization:');
    const setupData = mfaManager.initialize2FA('test@example.com', 'Test App');
    console.log('✅ Setup data:', setupData);
    
    // Test 2: Generate current token
    console.log('\n2. Testing Current Token Generation:');
    const currentToken = mfaManager.getCurrentToken();
    console.log('✅ Current token:', currentToken);
    
    // Test 3: Verify token
    console.log('\n3. Testing Token Verification:');
    const isValid = mfaManager.verify2FAToken(currentToken);
    console.log('✅ Token verification result:', isValid);
    
    // Test 4: Get time remaining
    console.log('\n4. Testing Time Remaining:');
    const timeRemaining = mfaManager.getTimeRemaining();
    console.log('✅ Time remaining:', timeRemaining, 'seconds');
    
    // Test 5: Get setup instructions
    console.log('\n5. Testing Setup Instructions:');
    const instructions = mfaManager.getSetupInstructions();
    console.log('✅ Setup instructions:', instructions);
    
    // Test 6: Validate backup codes
    console.log('\n6. Testing Backup Code Validation:');
    if (setupData.backupCodes && setupData.backupCodes.length > 0) {
      const firstBackupCode = setupData.backupCodes[0];
      const isValidBackup = mfaManager.validateBackupCode(firstBackupCode);
      console.log('✅ Backup code validation result:', isValidBackup);
    }
    
    console.log('\n🎉 MFA Manager test completed!');
    
  } catch (error) {
    console.error('❌ MFA Manager test failed:', error);
  }
};

/**
 * Test core OTP functions
 */
export const testCoreOTP = () => {
  console.log('🧪 Testing Core OTP Functions...');
  
  try {
    // Test 1: Generate secret
    console.log('\n1. Testing Secret Generation:');
    const secret = generateSecret();
    console.log('✅ Secret generated:', secret);
    console.log('✅ Secret length:', secret.length);
    
    // Test 2: Generate TOTP URI
    console.log('\n2. Testing TOTP URI Generation:');
    const uri = generateTOTPURI('test@example.com', 'Test App', secret);
    console.log('✅ TOTP URI:', uri);
    
    // Test 3: Generate QR code URL
    console.log('\n3. Testing QR Code URL Generation:');
    const qrURL = generateQRCodeURL(uri, 200);
    console.log('✅ QR Code URL:', qrURL);
    
    // Test 4: Generate current token
    console.log('\n4. Testing Current Token Generation:');
    const currentToken = generateCurrentToken(secret);
    console.log('✅ Current token:', currentToken);
    
    // Test 5: Verify token
    console.log('\n5. Testing Token Verification:');
    const isValid = verifyToken(currentToken, secret);
    console.log('✅ Token verification result:', isValid);
    
    // Test 6: Get time information
    console.log('\n6. Testing Time Information:');
    const timeRemaining = getTimeRemaining();
    console.log('✅ Time remaining:', timeRemaining, 'seconds');
    
    console.log('\n🎉 Core OTP test completed!');
    
  } catch (error) {
    console.error('❌ Core OTP test failed:', error);
  }
};

/**
 * Run all tests
 */
export const runAllTests = async () => {
  console.log('🚀 Running All Authentication Module Tests...\n');
  
  // Test core OTP functions
  testCoreOTP();
  
  // Wait a bit between tests
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test MFA Manager
  testMFAManager();
  
  // Wait a bit between tests
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test complete 2FA flow (commented out to avoid Firebase operations in test)
  // testComplete2FAFlow();
  
  console.log('\n🎉 All tests completed!');
};

// Auto-run tests if this file is imported
if (typeof window !== 'undefined') {
  console.log('Authentication Module test functions loaded.');
  console.log('Available test functions:');
  console.log('- testCoreOTP()');
  console.log('- testMFAManager()');
  console.log('- testComplete2FAFlow()');
  console.log('- runAllTests()');
}
