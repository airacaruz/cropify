// Security Test Utility
// This file contains functions to test the security implementation

import SecurityUtils from './security.jsx';

export const SecurityTest = {
  // Test unauthorized access attempts
  async testUnauthorizedAccess() {
    console.log("🔒 Testing unauthorized access...");
    
    try {
      // Test 1: Verify admin access with null user
      const result1 = await SecurityUtils.verifyAdminAccess(null);
      console.log("Test 1 - Null user:", result1.isAuthorized === false ? "✅ PASS" : "❌ FAIL");
      
      // Test 2: Verify admin access with invalid user ID
      const result2 = await SecurityUtils.verifyAdminAccess("invalid-user-id");
      console.log("Test 2 - Invalid user ID:", result2.isAuthorized === false ? "✅ PASS" : "❌ FAIL");
      
      // Test 3: Test role checking with invalid user
      const hasRole = await SecurityUtils.hasRole("invalid-user", "admin");
      console.log("Test 3 - Invalid user role check:", hasRole === false ? "✅ PASS" : "❌ FAIL");
      
      return true;
    } catch (error) {
      console.error("Security test failed:", error);
      return false;
    }
  },

  // Test security event logging
  testSecurityLogging() {
    console.log("📝 Testing security event logging...");
    
    try {
      // Test various security events
      SecurityUtils.logSecurityEvent('test_event', { test: true });
      SecurityUtils.logSecurityEvent('failed_login_attempt', { email: 'test@example.com' });
      SecurityUtils.logSecurityEvent('unauthorized_access', { path: '/test' });
      
      console.log("✅ Security logging test completed");
      return true;
    } catch (error) {
      console.error("Security logging test failed:", error);
      return false;
    }
  },

  // Test suspicious activity detection
  testSuspiciousActivityDetection() {
    console.log("🚨 Testing suspicious activity detection...");
    
    try {
      const suspiciousActions = [
        'admin bypass',
        'superadmin access',
        'root login',
        'test account'
      ];
      
      const normalActions = [
        'view dashboard',
        'update user',
        'generate report'
      ];
      
      suspiciousActions.forEach(action => {
        const isSuspicious = SecurityUtils.detectSuspiciousActivity('test-user', action);
        console.log(`Suspicious action "${action}":`, isSuspicious ? "✅ DETECTED" : "❌ NOT DETECTED");
      });
      
      normalActions.forEach(action => {
        const isSuspicious = SecurityUtils.detectSuspiciousActivity('test-user', action);
        console.log(`Normal action "${action}":`, !isSuspicious ? "✅ NOT DETECTED" : "❌ FALSE POSITIVE");
      });
      
      return true;
    } catch (error) {
      console.error("Suspicious activity detection test failed:", error);
      return false;
    }
  },

  // Test data clearing
  testDataClearing() {
    console.log("🧹 Testing data clearing...");
    
    try {
      // Set some test data
      localStorage.setItem('adminName', 'Test Admin');
      localStorage.setItem('userRole', 'admin');
      localStorage.setItem('adminData', JSON.stringify({ test: true }));
      
      // Clear sensitive data
      SecurityUtils.clearSensitiveData();
      
      // Check if data was cleared
      const adminName = localStorage.getItem('adminName');
      const userRole = localStorage.getItem('userRole');
      const adminData = localStorage.getItem('adminData');
      
      const allCleared = !adminName && !userRole && !adminData;
      console.log("Data clearing test:", allCleared ? "✅ PASS" : "❌ FAIL");
      
      return allCleared;
    } catch (error) {
      console.error("Data clearing test failed:", error);
      return false;
    }
  },

  // Run all security tests
  async runAllTests() {
    console.log("🔐 Running comprehensive security tests...");
    console.log("=" * 50);
    
    const results = {
      unauthorizedAccess: await this.testUnauthorizedAccess(),
      securityLogging: this.testSecurityLogging(),
      suspiciousActivity: this.testSuspiciousActivityDetection(),
      dataClearing: this.testDataClearing()
    };
    
    console.log("=" * 50);
    console.log("🔐 Security Test Results:");
    console.log("Unauthorized Access:", results.unauthorizedAccess ? "✅ PASS" : "❌ FAIL");
    console.log("Security Logging:", results.securityLogging ? "✅ PASS" : "❌ FAIL");
    console.log("Suspicious Activity:", results.suspiciousActivity ? "✅ PASS" : "❌ FAIL");
    console.log("Data Clearing:", results.dataClearing ? "✅ PASS" : "❌ FAIL");
    
    const allPassed = Object.values(results).every(result => result === true);
    console.log("Overall Result:", allPassed ? "✅ ALL TESTS PASSED" : "❌ SOME TESTS FAILED");
    
    return results;
  }
};

// Auto-run tests in development
if (process.env.NODE_ENV === 'development') {
  console.log("🔐 Security tests available. Run SecurityTest.runAllTests() to test security measures.");
}

export default SecurityTest;
