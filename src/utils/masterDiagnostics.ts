import './syncDiagnostics';
import './deepDataDiagnostics';
import './importValidator';
import './enhancedImport';
import './syncFix';

/**
 * Master Diagnostics - One command to rule them all
 */
export class MasterDiagnostics {
  static async runComplete(): Promise<void> {
    console.log(`
╔════════════════════════════════════════════╗
║    📊 MASTER DIAGNOSTICS FOR DATA LOSS     ║
║         כימיה אורגנית 1 - 10 Lessons      ║
╚════════════════════════════════════════════╝
    `);

    console.log('🔍 Phase 1: Current State Analysis\n');
    
    // Check local storage
    const localData = localStorage.getItem('studyDashboardCourses');
    if (!localData) {
      console.error('❌ CRITICAL: No data in localStorage!');
      console.log('💡 Action: Run syncFix.restore() to recover from backups');
      return;
    }

    const courses = JSON.parse(localData);
    const organicChem = courses.find((c: any) => c.קורס === "כימיה אורגנית 1");
    
    console.log(`📚 Total Courses: ${courses.length}`);
    
    if (!organicChem) {
      console.error('❌ CRITICAL: "כימיה אורגנית 1" not found!');
      console.log('\n🔧 RECOMMENDED ACTIONS:');
      console.log('1. Check if you have the correct import file');
      console.log('2. Run: syncFix.restore() to check backups');
      console.log('3. Re-import using: enhancedImport.importFromInput()');
      return;
    }

    const lessonCount = organicChem.שיעורים?.length || 0;
    console.log(`\n📖 כימיה אורגנית 1 Status:`);
    console.log(`   Course ID: ${organicChem.id}`);
    console.log(`   Lessons: ${lessonCount} ${lessonCount === 10 ? '✅' : '❌ (Expected 10)'}`);
    
    if (lessonCount < 10) {
      console.log('\n📋 Current Lessons:');
      organicChem.שיעורים?.forEach((lesson: any, i: number) => {
        console.log(`   ${i + 1}. ${lesson.שם}`);
      });
    }

    // Deep analysis
    console.log('\n🔍 Phase 2: Deep Structure Analysis\n');
    
    let totalTopics = 0;
    let totalGoals = 0;
    let totalCompleted = 0;
    
    organicChem.שיעורים?.forEach((lesson: any) => {
      const topicCount = lesson.נושאים?.length || 0;
      totalTopics += topicCount;
      
      lesson.נושאים?.forEach((topic: any) => {
        totalGoals += topic.מטרות?.length || 0;
        totalCompleted += topic.completedGoals?.length || 0;
      });
    });
    
    console.log(`📊 Data Statistics:`);
    console.log(`   Total Topics: ${totalTopics}`);
    console.log(`   Total Goals: ${totalGoals}`);
    console.log(`   Completed Goals: ${totalCompleted}`);

    // Check Firebase sync
    console.log('\n🔍 Phase 3: Firebase Sync Status\n');
    
    const isAuthenticated = (window as any).auth?.currentUser ? true : false;
    console.log(`🔐 Authentication: ${isAuthenticated ? '✅ Logged in' : '❌ Not logged in'}`);
    
    if (isAuthenticated) {
      await (window as any).deepDiag.traceSync(organicChem.id);
    }

    // Data size check
    console.log('\n🔍 Phase 4: Data Size Analysis\n');
    
    const dataSize = new Blob([JSON.stringify(organicChem)]).size;
    console.log(`📏 Course Data Size: ${(dataSize / 1024).toFixed(2)}KB`);
    
    if (dataSize > 900000) {
      console.warn('⚠️ WARNING: Course approaching Firestore 1MB limit!');
      console.log('💡 This may cause sync failures');
    }

    // Provide action plan
    console.log('\n');
    console.log('╔════════════════════════════════════════════╗');
    console.log('║            🔧 ACTION PLAN                  ║');
    console.log('╚════════════════════════════════════════════╝');
    
    if (lessonCount === 10) {
      console.log('\n✅ Local data is complete! Issues may be with sync.\n');
      console.log('Actions:');
      console.log('1. Force sync to Firebase: syncFix.fix()');
      console.log('2. Verify sync worked: deepDiag.compareStructure()');
    } else {
      console.log('\n❌ Local data is incomplete!\n');
      console.log('Actions:');
      console.log('1. Try recovery: syncFix.restore()');
      console.log('2. If that fails, re-import your file:');
      console.log('   - Select your JSON file in the import dialog');
      console.log('   - Run: await enhancedImport.importFromInput()');
      console.log('3. After import, verify: masterDiag.run()');
      console.log('4. Force sync: syncFix.fix()');
    }

    console.log('\n💡 Additional Commands:');
    console.log('- Check all courses: deepDiag.getStats()');
    console.log('- Audit specific course: deepDiag.auditCourse(' + organicChem.id + ')');
    console.log('- Compare with Firebase: deepDiag.compareStructure()');
    console.log('- Emergency restore: syncFix.restore()');
  }

  static quickFix(): void {
    console.log('🚀 QUICK FIX: Running automated repair sequence...\n');
    
    console.log('1️⃣ Checking current state...');
    (window as any).syncFix.status();
    
    console.log('\n2️⃣ Running sync fix...');
    (window as any).syncFix.fix().then(() => {
      console.log('\n3️⃣ Verifying fix...');
      setTimeout(() => {
        (window as any).syncFix.status();
        console.log('\n✅ Quick fix completed! Refresh the page to see changes.');
      }, 2000);
    });
  }
}

// Export to window
(window as any).masterDiag = {
  run: () => MasterDiagnostics.runComplete(),
  quickFix: () => MasterDiagnostics.quickFix()
};

// Auto-run on load
console.log(`
🎯 MASTER DIAGNOSTICS LOADED 🎯

Quick Commands:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
masterDiag.run()      - Full diagnostic report
masterDiag.quickFix() - Automated fix attempt

Running initial diagnosis...
`);

// Run diagnosis automatically
MasterDiagnostics.runComplete();