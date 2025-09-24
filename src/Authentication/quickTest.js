/**
 * Quick Test for 2FA Setup
 * Simple test to verify the 2FA setup works with existing database
 */

// Import the MFA manager directly
import { mfaManager } from './mfaManager.js';

/**
 * Test basic 2FA generation
 */
export const testBasic2FAGeneration = () => {
    console.log('🔍 Testing basic 2FA generation...');
    
    try {
        // Test with the admin data from your Firebase
        const adminName = 'Kier Cedric C. Demano';
        const serviceName = 'Cropify Admin';
        
        // Generate setup data
        const setupData = mfaManager.initialize2FA(adminName, serviceName);
        
        console.log('✅ 2FA setup data generated successfully');
        console.log('Secret:', setupData.secret);
        console.log('QR Code URL:', setupData.qrCodeURL);
        console.log('TOTP URI:', setupData.totpURI);
        console.log('Backup Codes:', setupData.backupCodes);
        
        // Validate the data
        if (setupData.secret && setupData.qrCodeURL && setupData.totpURI) {
            console.log('✅ All required fields are present');
            return true;
        } else {
            console.log('❌ Missing required fields');
            return false;
        }
        
    } catch (error) {
        console.error('❌ 2FA generation test failed:', error);
        return false;
    }
};

/**
 * Test token generation
 */
export const testTokenGeneration = async () => {
    console.log('🔍 Testing token generation...');
    
    try {
        // Generate a test secret
        const setupData = mfaManager.initialize2FA('Test User', 'Test Service');
        
        // Generate current token
        const currentToken = await mfaManager.getCurrentToken(setupData.secret);
        
        console.log('✅ Token generated successfully');
        console.log('Current token:', currentToken);
        console.log('Token length:', currentToken ? currentToken.length : 0);
        
        // Validate token
        if (currentToken && currentToken.length === 6) {
            console.log('✅ Token is valid (6 digits)');
            return true;
        } else {
            console.log('❌ Invalid token format');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Token generation test failed:', error);
        return false;
    }
};

/**
 * Test token verification
 */
export const testTokenVerification = async () => {
    console.log('🔍 Testing token verification...');
    
    try {
        // Generate setup data
        const setupData = mfaManager.initialize2FA('Test User', 'Test Service');
        
        // Generate current token
        const currentToken = await mfaManager.getCurrentToken(setupData.secret);
        
        // Verify the token
        const isValid = await mfaManager.verify2FAToken(currentToken, setupData.secret);
        
        console.log('✅ Token verification test completed');
        console.log('Generated token:', currentToken);
        console.log('Verification result:', isValid ? 'VALID' : 'INVALID');
        
        return isValid;
        
    } catch (error) {
        console.error('❌ Token verification test failed:', error);
        return false;
    }
};

/**
 * Run all quick tests
 */
export const runQuickTests = async () => {
    console.log('🚀 Starting quick 2FA tests...\n');
    
    const results = {
        generation: testBasic2FAGeneration(),
        tokenGen: await testTokenGeneration(),
        verification: await testTokenVerification()
    };
    
    console.log('\n📊 Quick Test Results:');
    console.log('======================');
    console.log('Generation Test:', results.generation ? '✅ PASSED' : '❌ FAILED');
    console.log('Token Generation:', results.tokenGen ? '✅ PASSED' : '❌ FAILED');
    console.log('Verification Test:', results.verification ? '✅ PASSED' : '❌ FAILED');
    
    const allPassed = Object.values(results).every(result => result === true);
    console.log('\n🎯 Overall Result:', allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
    
    return allPassed;
};

// Export default test runner
export default {
    testBasic2FAGeneration,
    testTokenGeneration,
    testTokenVerification,
    runQuickTests
};
