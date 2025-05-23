import { collection, getDocs } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export async function debugFirebaseData() {
  if (!db || !auth?.currentUser) {
    console.log('❌ Firebase not configured or user not authenticated');
    return;
  }

  const userId = auth.currentUser.uid;
  console.log('🔍 Debugging Firebase data for user:', userId);
  
  try {
    // Get all courses
    const coursesRef = collection(db, `users/${userId}/courses`);
    const snapshot = await getDocs(coursesRef);
    
    console.log(`📚 Found ${snapshot.docs.length} courses in Firebase`);
    
    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n📘 Course ${index + 1} (ID: ${doc.id}):`);
      console.log('  Name:', data.קורס);
      console.log('  Has lessons field:', 'שיעורים' in data);
      console.log('  Lessons count:', data.שיעורים?.length || 0);
      
      if (data.שיעורים && Array.isArray(data.שיעורים)) {
        data.שיעורים.forEach((lesson: any, lessonIndex: number) => {
          console.log(`    📄 Lesson ${lessonIndex + 1}:`, lesson.שם);
          console.log(`       Topics:`, lesson.נושאים?.length || 0);
        });
      } else {
        console.log('  ⚠️  No lessons array found!');
      }
      
      // Show all fields
      console.log('  All fields:', Object.keys(data));
      
      // Show raw data
      console.log('  Raw data:', JSON.stringify(data, null, 2));
    });
    
    // Also check localStorage
    console.log('\n\n📦 Checking localStorage:');
    const localData = localStorage.getItem('studyDashboardCourses');
    if (localData) {
      const courses = JSON.parse(localData);
      console.log(`Found ${courses.length} courses in localStorage`);
      courses.forEach((course: any, index: number) => {
        console.log(`Course ${index + 1}: ${course.קורס} - ${course.שיעורים?.length || 0} lessons`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error debugging Firebase data:', error);
  }
}

// Make it available globally for console debugging
(window as any).debugFirebaseData = debugFirebaseData;