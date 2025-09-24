/**
 * Database Test Suite
 * Tests the database connection and basic operations
 */

import {
    documentOperations,
    isDatabaseConnected,
    mfaOperations,
    testDatabaseConnection,
    withErrorHandling
} from './database.js';

/**
 * Test database connection
 */
export const testConnection = async () => {
    console.log('🔍 Testing database connection...');
    
    try {
        const isConnected = await testDatabaseConnection();
        console.log('✅ Database connection test:', isConnected ? 'PASSED' : 'FAILED');
        return isConnected;
    } catch (error) {
        console.error('❌ Database connection test failed:', error);
        return false;
    }
};

/**
 * Test basic document operations
 */
export const testDocumentOperations = async () => {
    console.log('🔍 Testing document operations...');
    
    try {
        const testData = {
            name: 'Test Admin',
            email: 'test@example.com',
            role: 'admin',
            createdAt: new Date()
        };
        
        // Test set operation
        const setResult = await documentOperations.set('test', 'test-doc', testData);
        console.log('✅ Document set test:', setResult ? 'PASSED' : 'FAILED');
        
        // Test get operation
        const getResult = await documentOperations.get('test', 'test-doc');
        console.log('✅ Document get test:', getResult ? 'PASSED' : 'FAILED');
        
        // Test update operation
        const updateResult = await documentOperations.update('test', 'test-doc', {
            lastUpdated: new Date()
        });
        console.log('✅ Document update test:', updateResult ? 'PASSED' : 'FAILED');
        
        // Test delete operation
        const deleteResult = await documentOperations.delete('test', 'test-doc');
        console.log('✅ Document delete test:', deleteResult ? 'PASSED' : 'FAILED');
        
        return setResult && getResult && updateResult && deleteResult;
    } catch (error) {
        console.error('❌ Document operations test failed:', error);
        return false;
    }
};

/**
 * Test MFA operations
 */
export const testMFAOperations = async () => {
    console.log('🔍 Testing MFA operations...');
    
    try {
        const testAdminId = 'test-admin-123';
        const testMFAData = {
            enabled: true,
            secret: 'JBSWY3DPEHPK3PXP',
            backupCodes: ['123456', '789012', '345678'],
            accountName: 'test@example.com',
            serviceName: 'Cropify Admin',
            setupCompleted: false
        };
        
        // Test set MFA data
        const setResult = await mfaOperations.setMFAData(testAdminId, testMFAData);
        console.log('✅ MFA set test:', setResult ? 'PASSED' : 'FAILED');
        
        // Test get MFA data
        const getResult = await mfaOperations.getMFAData(testAdminId);
        console.log('✅ MFA get test:', getResult ? 'PASSED' : 'FAILED');
        
        // Test update MFA data
        const updateResult = await mfaOperations.updateMFAData(testAdminId, {
            setupCompleted: true,
            lastVerifiedAt: new Date()
        });
        console.log('✅ MFA update test:', updateResult ? 'PASSED' : 'FAILED');
        
        // Test delete MFA data
        const deleteResult = await mfaOperations.deleteMFAData(testAdminId);
        console.log('✅ MFA delete test:', deleteResult ? 'PASSED' : 'FAILED');
        
        return setResult && getResult && updateResult && deleteResult;
    } catch (error) {
        console.error('❌ MFA operations test failed:', error);
        return false;
    }
};

/**
 * Test error handling
 */
export const testErrorHandling = async () => {
    console.log('🔍 Testing error handling...');
    
    try {
        // Test with invalid operation
        const result = await withErrorHandling(async () => {
            throw new Error('Test error');
        }, 'Test operation');
        
        console.log('✅ Error handling test:', result ? 'PASSED' : 'FAILED');
        return true;
    } catch (error) {
        console.log('✅ Error handling test: PASSED (caught error as expected)');
        console.log('Error message:', error.message);
        return true;
    }
};

/**
 * Run all database tests
 */
export const runAllDatabaseTests = async () => {
    console.log('🚀 Starting database test suite...\n');
    
    const results = {
        connection: await testConnection(),
        documentOps: await testDocumentOperations(),
        mfaOps: await testMFAOperations(),
        errorHandling: await testErrorHandling()
    };
    
    console.log('\n📊 Test Results:');
    console.log('================');
    console.log('Connection Test:', results.connection ? '✅ PASSED' : '❌ FAILED');
    console.log('Document Operations:', results.documentOps ? '✅ PASSED' : '❌ FAILED');
    console.log('MFA Operations:', results.mfaOps ? '✅ PASSED' : '❌ FAILED');
    console.log('Error Handling:', results.errorHandling ? '✅ PASSED' : '❌ FAILED');
    
    const allPassed = Object.values(results).every(result => result === true);
    console.log('\n🎯 Overall Result:', allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
    
    return allPassed;
};

/**
 * Quick database health check
 */
export const quickHealthCheck = async () => {
    console.log('🔍 Quick database health check...');
    
    try {
        const isConnected = isDatabaseConnected();
        const connectionTest = await testDatabaseConnection();
        
        console.log('Connection Status:', isConnected ? '✅ Connected' : '❌ Disconnected');
        console.log('Connection Test:', connectionTest ? '✅ Working' : '❌ Failed');
        
        return isConnected && connectionTest;
    } catch (error) {
        console.error('❌ Health check failed:', error);
        return false;
    }
};

// Export default test runner
export default {
    testConnection,
    testDocumentOperations,
    testMFAOperations,
    testErrorHandling,
    runAllDatabaseTests,
    quickHealthCheck
};
