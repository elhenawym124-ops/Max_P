/**
 * Script to reset blocked IPs in the security system
 * This script will clear all blocked and suspicious IPs
 */

const { securityLogger } = require('./middleware/globalSecurity');

console.log('🔍 Checking current security status...');

// Get current security report
const report = securityLogger.getSecurityReport();
console.log('📊 Current Security Report:');
console.log('   - Blocked IPs:', report.blockedIPs.length);
console.log('   - Suspicious IPs:', report.suspiciousIPs.length);
console.log('   - Total Security Events:', report.totalEvents);

// Clear blocked IPs
console.log('🔓 Clearing blocked IPs...');
const blockedCount = report.blockedIPs.length;
securityLogger.blockedIPs.clear();

// Clear suspicious IPs
console.log('🧹 Clearing suspicious IPs...');
const suspiciousCount = report.suspiciousIPs.length;
securityLogger.suspiciousIPs.clear();

console.log(`✅ Successfully cleared ${blockedCount} blocked IPs and ${suspiciousCount} suspicious IPs`);
console.log('✅ You should now be able to login again');

// Show updated report
const updatedReport = securityLogger.getSecurityReport();
console.log('📊 Updated Security Report:');
console.log('   - Blocked IPs:', updatedReport.blockedIPs.length);
console.log('   - Suspicious IPs:', updatedReport.suspiciousIPs.length);