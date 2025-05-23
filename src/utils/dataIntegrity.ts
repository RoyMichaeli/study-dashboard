import type { Course, Lesson } from '../types';

/**
 * Validates if an object is a properly structured course
 */
export function isValidCourse(obj: any): obj is Course {
  return obj && 
         typeof obj.id === 'number' &&
         typeof obj.קורס === 'string' &&
         Array.isArray(obj.שיעורים);
}

/**
 * Validates if an object is a properly structured lesson
 */
export function isValidLesson(obj: any): boolean {
  return obj &&
         typeof obj.שם === 'string' &&
         typeof obj.מצגת === 'string' &&
         Array.isArray(obj.נושאים);
}

/**
 * Checks if an object is a lesson masquerading as a course
 */
export function isLessonAsCoursee(obj: any): boolean {
  // Has lesson fields but not course fields
  return obj &&
         !obj.קורס &&  // Missing course name
         !obj.שיעורים && // Missing lessons array
         (obj.מצגת || obj.נושאים); // Has lesson fields
}

/**
 * Migrates corrupted data where lessons appear as courses
 */
export function migrateCorruptedData(items: any[]): Course[] {
  console.log('🔧 Starting data migration, processing', items.length, 'items');
  
  const validCourses: Course[] = [];
  const orphanedLessons: Lesson[] = [];
  const unidentified: any[] = [];
  
  items.forEach((item, index) => {
    console.log(`Analyzing item ${index}:`, {
      id: item.id,
      hasקורס: !!item.קורס,
      hasשיעורים: !!item.שיעורים,
      hasמצגת: !!item.מצגת,
      hasנושאים: !!item.נושאים
    });
    
    if (isValidCourse(item)) {
      // This is a proper course
      console.log(`✅ Item ${index} is a valid course:`, item.קורס);
      validCourses.push(item);
    } else if (isLessonAsCoursee(item)) {
      // This is a lesson masquerading as a course
      console.log(`⚠️ Item ${index} is a lesson masquerading as a course`);
      const lesson: Lesson = {
        שם: item.מצגת || `שיעור ${index + 1}`,
        מצגת: item.מצגת || '',
        נושאים: item.נושאים || []
      };
      orphanedLessons.push(lesson);
    } else {
      // Unidentified structure
      console.log(`❓ Item ${index} has unknown structure`);
      unidentified.push(item);
    }
  });
  
  // Create a recovery course for orphaned lessons
  if (orphanedLessons.length > 0) {
    console.log(`📦 Creating recovery course for ${orphanedLessons.length} orphaned lessons`);
    const recoveryCourse: Course = {
      id: Date.now(),
      קורס: '📌 שיעורים משוחזרים - נא לארגן מחדש',
      שיעורים: orphanedLessons
    };
    validCourses.push(recoveryCourse);
  }
  
  // Log summary
  console.log('📊 Migration summary:', {
    totalItems: items.length,
    validCourses: validCourses.length - (orphanedLessons.length > 0 ? 1 : 0),
    orphanedLessons: orphanedLessons.length,
    unidentified: unidentified.length
  });
  
  if (unidentified.length > 0) {
    console.warn('⚠️ Unidentified items:', unidentified);
  }
  
  return validCourses;
}

/**
 * Ensures all courses have proper structure
 */
export function sanitizeCourses(courses: any[]): Course[] {
  return courses.map(course => {
    if (!isValidCourse(course)) {
      console.warn('Invalid course structure, fixing:', course);
      return {
        id: course.id || Date.now(),
        קורס: course.קורס || 'קורס ללא שם',
        שיעורים: Array.isArray(course.שיעורים) ? course.שיעורים : []
      };
    }
    return course;
  });
}

/**
 * Deep validates entire data structure
 */
export function validateDataIntegrity(courses: Course[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  courses.forEach((course, courseIndex) => {
    if (!course.id) {
      errors.push(`Course at index ${courseIndex} missing ID`);
    }
    if (!course.קורס) {
      errors.push(`Course at index ${courseIndex} missing name`);
    }
    if (!Array.isArray(course.שיעורים)) {
      errors.push(`Course "${course.קורס}" has invalid lessons array`);
    } else {
      course.שיעורים.forEach((lesson, lessonIndex) => {
        if (!lesson.שם) {
          errors.push(`Lesson at index ${lessonIndex} in course "${course.קורס}" missing name`);
        }
        if (!Array.isArray(lesson.נושאים)) {
          errors.push(`Lesson "${lesson.שם}" in course "${course.קורס}" has invalid topics array`);
        }
      });
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Make functions available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).dataIntegrity = {
    isValidCourse,
    isValidLesson,
    isLessonAsCoursee,
    migrateCorruptedData,
    sanitizeCourses,
    validateDataIntegrity
  };
}