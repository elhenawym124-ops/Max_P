const { securityLogger } = require('./middleware/globalSecurity');

console.log('🔍 Debugging security system...');

// Check current blocked IPs
console.log('Blocked IPs:', securityLogger.blockedIPs);
console.log('Suspicious IPs:', securityLogger.suspiciousIPs);

// Add localhost IPs to the sets to see if they're being blocked
const localhostIPs = ['::1', '127.0.0.1', '::ffff:127.0.0.1', 'localhost'];
console.log('\nChecking localhost IPs:');
localhostIPs.forEach(ip => {
  console.log(`  ${ip}:`);
  console.log(`    - is blocked: ${securityLogger.isIPBlocked(ip)}`);
  console.log(`    - is suspicious: ${securityLogger.isIPSuspicious(ip)}`);
});

// Clear all blocked IPs forcefully
console.log('\nClearing all blocked IPs...');
securityLogger.blockedIPs.clear();
securityLogger.suspiciousIPs.clear();

console.log('After clearing:');
console.log('Blocked IPs:', Array.from(securityLogger.blockedIPs));
console.log('Suspicious IPs:', Array.from(securityLogger.suspiciousIPs));