const { securityLogger } = require('./middleware/globalSecurity');

console.log('🔍 Diagnosing security system...');

// Get current security report
const report = securityLogger.getSecurityReport();
console.log('📊 Current Security Report:');
console.log('   - Blocked IPs:', report.blockedIPs);
console.log('   - Suspicious IPs:', report.suspiciousIPs);
console.log('   - Total Security Events:', report.totalEvents);
console.log('   - Events by type:', report.eventsByType);

// Check for recent critical events
if (report.recentCriticalEvents && report.recentCriticalEvents.length > 0) {
  console.log('🚨 Recent Critical Events:');
  report.recentCriticalEvents.forEach(event => {
    console.log(`   - ${event.timestamp} [${event.type}] IP: ${event.ip || 'N/A'} - ${JSON.stringify(event)}`);
  });
} else {
  console.log('✅ No recent critical events');
}

// Check if localhost IPs are blocked
const localhostIPs = ['::1', '127.0.0.1', '::ffff:127.0.0.1'];
console.log('🔍 Checking if localhost IPs are blocked:');
localhostIPs.forEach(ip => {
  const isBlocked = securityLogger.isIPBlocked(ip);
  const isSuspicious = securityLogger.isIPSuspicious(ip);
  console.log(`   - ${ip}: Blocked=${isBlocked}, Suspicious=${isSuspicious}`);
});

console.log('✅ Security diagnosis complete');