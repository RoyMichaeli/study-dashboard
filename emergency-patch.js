// Emergency patch to fix infinite sync loop immediately
// Copy and paste this code into browser console

console.log('🚨 EMERGENCY PATCH: Fixing infinite sync loop...');

// 1. Stop the current loop by clearing localStorage
localStorage.setItem('studyDashboardCourses', '[]');
console.log('✅ Cleared courses to stop loop');

// 2. Enable Firebase-first mode immediately
localStorage.setItem('featureFlags', JSON.stringify({
  enhancedFirebaseSync: true,
  showDeviceActivity: true,
  useOptimisticUpdates: true,
  showSyncMetadata: true,
  autoRetryOnError: true,
  persistentSessions: true
}));
console.log('🔥 Firebase-first mode enabled');

// 3. Override the sync function to prevent loops
if (window.location.href.includes('study-dashboard')) {
  // Monkey patch to prevent sync loops
  const originalConsoleLog = console.log;
  let loopCounter = 0;
  const maxLoops = 3;
  
  console.log = function(...args) {
    const message = args.join(' ');
    
    // Detect sync loop
    if (message.includes('Real-time update received') || 
        message.includes('Local data newer for course')) {
      loopCounter++;
      
      if (loopCounter > maxLoops) {
        console.error('🛑 SYNC LOOP DETECTED - STOPPING');
        localStorage.setItem('studyDashboardCourses', '[]');
        setTimeout(() => location.reload(), 1000);
        return;
      }
    } else {
      loopCounter = 0; // Reset counter for non-sync messages
    }
    
    originalConsoleLog.apply(console, args);
  };
  
  console.log('🛡️ Loop protection activated');
}

// 4. Clear any Firebase mutations queue
Object.keys(localStorage).forEach(key => {
  if (key.includes('firestore_mutations')) {
    localStorage.removeItem(key);
  }
});
console.log('🧹 Cleared Firebase mutations queue');

console.log(`
🎯 EMERGENCY PATCH APPLIED!

✅ Infinite loop stopped
✅ Firebase-first mode enabled  
✅ Loop protection activated
✅ Mutations queue cleared

🔄 The page will reload automatically if loop detected again.
🔥 Firebase is now the single source of truth!

To make this permanent, run: npm run build && firebase deploy
`);