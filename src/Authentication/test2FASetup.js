/**
 * Test 2FA Setup with Existing Database
 * Tests the 2FA setup process with the current Firebase data
 */

import {
    completeAdmin2FASetup,
    disableAdmin2FA,
    isAdmin2FAEnabled,
    setupComplete2FA,
    verifyAdmin2FA
} from './index.js';

/**
 * Test 2FA setup for existing admin
 */
export const test2FASetupForExistingAdmin = async () => {
    console.log('🔍 Testing 2FA setup for existing admin...');
    
    try {
        // Use the admin ID from your Firebase data
        const adminId = 'iZZmHDsvl7dXAAN6rZxGfd'; // From your Firebase screenshot
        const adminName = 'Kier Cedric C. Demano'; // From your Firebase data
        const adminEmail = 'trainerazazelcrypto@gm'; // From your Firebase data
        
        console.log('Admin ID:', adminId);
        console.log('Admin Name:', adminName);
        console.log('Admin Email:', adminEmail);
        
        // Step 1: Check current 2FA status
        console.log('\n📊 Checking current 2FA status...');
        const currentStatus = await isAdmin2FAEnabled(adminId);
        console.log('Current 2FA status:', currentStatus ? 'ENABLED' : 'DISABLED');
        
        // Step 2: Generate 2FA setup data
        console.log('\n🔑 Generating 2FA setup data...');
        const setupData = await setupComplete2FA(adminId, adminName, 'Cropify Admin');
        
        if (setupData.success) {
            console.log('✅ 2FA setup data generated successfully');
            console.log('Secret:', setupData.secret);
            console.log('QR Code URL:', setupData.qrCodeURL);
            console.log('Backup Codes:', setupData.backupCodes);
            
            // Step 3: Simulate verification (you'll need to use a real token from your authenticator app)
            console.log('\n🔐 Testing verification process...');
            console.log('Note: You need to scan the QR code with your authenticator app and enter the 6-digit code');
            
            // For testing, we'll use a placeholder token
            // In real usage, you would get this from the user's authenticator app
            const testToken = '123456'; // Replace with actual token from authenticator app
            
            console.log('Testing with token:', testToken);
            const isValid = await verifyAdmin2FA(adminId, testToken);
            console.log('Token verification result:', isValid ? 'VALID' : 'INVALID');
            
            if (isValid) {
                // Step 4: Complete setup
                console.log('\n✅ Completing 2FA setup...');
                const setupCompleted = await completeAdmin2FASetup(adminId, testToken);
                console.log('Setup completion result:', setupCompleted ? 'SUCCESS' : 'FAILED');
                
                // Step 5: Verify final status
                const finalStatus = await isAdmin2FAEnabled(adminId);
                console.log('Final 2FA status:', finalStatus ? 'ENABLED' : 'DISABLED');
            }
            
        } else {
            console.log('❌ Failed to generate 2FA setup data');
            console.log('Error:', setupData.error);
        }
        
        return setupData.success;
        
    } catch (error) {
        console.error('❌ 2FA setup test failed:', error);
        return false;
    }
};

/**
 * Test 2FA disable for existing admin
 */
export const test2FADisableForExistingAdmin = async () => {
    console.log('🔍 Testing 2FA disable for existing admin...');
    
    try {
        const adminId = 'iZZmHDsvl7dXAAN6rZxGfd';
        
        // Check current status
        const currentStatus = await isAdmin2FAEnabled(adminId);
        console.log('Current 2FA status:', currentStatus ? 'ENABLED' : 'DISABLED');
        
        if (currentStatus) {
            // Disable 2FA
            const disableResult = await disableAdmin2FA(adminId);
            console.log('Disable result:', disableResult ? 'SUCCESS' : 'FAILED');
            
            // Check final status
            const finalStatus = await isAdmin2FAEnabled(adminId);
            console.log('Final 2FA status:', finalStatus ? 'ENABLED' : 'DISABLED');
            
            return disableResult;
        } else {
            console.log('2FA is already disabled');
            return true;
        }
        
    } catch (error) {
        console.error('❌ 2FA disable test failed:', error);
        return false;
    }
};

/**
 * Run all 2FA tests
 */
export const runAll2FATests = async () => {
    console.log('🚀 Starting 2FA test suite...\n');
    
    const results = {
        setup: await test2FASetupForExistingAdmin(),
        disable: await test2FADisableForExistingAdmin()
    };
    
    console.log('\n📊 2FA Test Results:');
    console.log('===================');
    console.log('Setup Test:', results.setup ? '✅ PASSED' : '❌ FAILED');
    console.log('Disable Test:', results.disable ? '✅ PASSED' : '❌ FAILED');
    
    const allPassed = Object.values(results).every(result => result === true);
    console.log('\n🎯 Overall Result:', allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
    
    return allPassed;
};

// Export default test runner
export default {
    test2FASetupForExistingAdmin,
    test2FADisableForExistingAdmin,
    runAll2FATests
};
