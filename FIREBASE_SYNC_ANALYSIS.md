# Firebase Course Data Sync Analysis

## Data Structure
The Course data model includes nested structures:
- Course (קורס) → Lessons (שיעורים) → Topics (נושאים) → Goals (מטרות)

## Key Findings

### 1. Data Structure is Correct
- The TypeScript interfaces properly define nested arrays
- The spread operator correctly preserves nested data
- Hebrew keys work fine with JavaScript and JSON

### 2. Potential Issues Identified

#### Issue 1: Firestore `merge: true` Option
**Problem**: Using `{ merge: true }` in batch.set() and setDoc() can cause issues with nested arrays. When merge is true, Firestore performs a shallow merge, which might not properly handle nested arrays.

**Fix Applied**: Removed `{ merge: true }` from:
- `batch.set()` in `saveAllCourses()`
- `setDoc()` in `saveCourse()`

#### Issue 2: Debug Logging Added
Added comprehensive logging to track data flow:
- `saveCourses()` in useCloudSync logs incoming data
- `saveAllCourses()` in FirebaseService logs data being saved
- `getCourses()` logs retrieved data
- `subscribeToCourses()` logs real-time updates

### 3. Data Flow
1. App.tsx → saveCourses() → FirebaseService.saveAllCourses()
2. Data is validated (including nested structure)
3. Data is saved to Firestore with timestamps
4. Real-time listener receives updates
5. Conflict resolution checks local vs cloud timestamps

## Recommendations

1. **Monitor Console Logs**: Check browser console for the added debug logs to verify:
   - Course lessons count when saving
   - Course lessons count when retrieving
   - Real-time update data structure

2. **Verify in Firebase Console**: Check Firestore database directly to see if:
   - Courses are saved with שיעורים array
   - The array contains the expected lesson objects

3. **Test Save/Load Cycle**:
   - Create/edit a course with lessons
   - Check console logs for lesson counts
   - Refresh page to load from Firebase
   - Verify lessons are preserved

## Next Steps if Issue Persists

1. **Check Firestore Rules**: Ensure rules allow reading/writing nested data
2. **Test without serverTimestamp()**: Temporarily remove timestamps to isolate issue
3. **Use Firestore Emulator**: Test locally to rule out production Firebase issues
4. **Check for Data Size Limits**: Ensure course data isn't exceeding Firestore document size limits

## Summary
The main fix was removing `{ merge: true }` which can cause issues with nested arrays in Firestore. The added logging will help diagnose if the issue persists.