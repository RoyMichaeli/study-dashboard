import type { Course } from '../types';

interface ImportValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    courseCount: number;
    totalLessons: number;
    totalTopics: number;
    totalGoals: number;
    coursesWithIssues: string[];
  };
  processedData: Course[];
}

interface DeepValidationOptions {
  enforceMinLessons?: number;
  enforceMinTopics?: number;
  enforceMinGoals?: number;
  checkForDuplicates?: boolean;
  validateHebrewFields?: boolean;
}

/**
 * Enhanced Import Validator to prevent data loss during import
 */
export class ImportValidator {
  /**
   * Validate imported data before saving
   */
  static validateImportData(
    data: any,
    options: DeepValidationOptions = {}
  ): ImportValidationResult {
    const result: ImportValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      stats: {
        courseCount: 0,
        totalLessons: 0,
        totalTopics: 0,
        totalGoals: 0,
        coursesWithIssues: []
      },
      processedData: []
    };

    // Check if data is an array
    if (!Array.isArray(data)) {
      result.valid = false;
      result.errors.push('נתונים שיובאו חייבים להיות מערך של קורסים');
      return result;
    }

    // Process each course
    data.forEach((course: any, index: number) => {
      const courseValidation = this.validateCourse(course, index, options);
      
      if (!courseValidation.valid) {
        result.valid = false;
        result.errors.push(...courseValidation.errors);
        result.stats.coursesWithIssues.push(course.קורס || `Course ${index + 1}`);
      }
      
      result.warnings.push(...courseValidation.warnings);
      result.stats.courseCount++;
      result.stats.totalLessons += courseValidation.lessonCount;
      result.stats.totalTopics += courseValidation.topicCount;
      result.stats.totalGoals += courseValidation.goalCount;
      
      // Add validated course to processed data
      result.processedData.push(courseValidation.processedCourse);
    });

    // Additional validation for specific courses
    const organicChem = data.find((c: any) => c.קורס === "כימיה אורגנית 1");
    if (organicChem) {
      const lessonCount = organicChem.שיעורים?.length || 0;
      if (lessonCount !== 10) {
        result.warnings.push(
          `⚠️ "כימיה אורגנית 1" אמור להכיל 10 שיעורים אך נמצאו ${lessonCount}`
        );
      }
    }

    return result;
  }

  /**
   * Validate individual course structure
   */
  private static validateCourse(
    course: any,
    index: number,
    options: DeepValidationOptions
  ): any {
    const errors: string[] = [];
    const warnings: string[] = [];
    let lessonCount = 0;
    let topicCount = 0;
    let goalCount = 0;

    // Basic structure validation
    if (!course.קורס || typeof course.קורס !== 'string') {
      errors.push(`קורס ${index + 1}: חסר שם קורס`);
    }

    if (!course.id || typeof course.id !== 'number') {
      course.id = Date.now() + index; // Generate ID if missing
      warnings.push(`קורס "${course.קורס}": נוצר ID חדש`);
    }

    // Validate lessons array
    if (!Array.isArray(course.שיעורים)) {
      errors.push(`קורס "${course.קורס}": שדה "שיעורים" חייב להיות מערך`);
      course.שיעורים = []; // Initialize empty array
    } else {
      lessonCount = course.שיעורים.length;
      
      // Validate each lesson
      course.שיעורים.forEach((lesson: any, lessonIndex: number) => {
        const lessonValidation = this.validateLesson(lesson, lessonIndex, course.קורס);
        warnings.push(...lessonValidation.warnings);
        topicCount += lessonValidation.topicCount;
        goalCount += lessonValidation.goalCount;
      });
    }

    // Check minimum requirements
    if (options.enforceMinLessons && lessonCount < options.enforceMinLessons) {
      warnings.push(
        `קורס "${course.קורס}": מכיל ${lessonCount} שיעורים (מינימום: ${options.enforceMinLessons})`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      lessonCount,
      topicCount,
      goalCount,
      processedCourse: course
    };
  }

  /**
   * Validate lesson structure
   */
  private static validateLesson(
    lesson: any,
    index: number,
    courseName: string
  ): any {
    const warnings: string[] = [];
    let topicCount = 0;
    let goalCount = 0;

    // Validate lesson fields
    if (!lesson.שם || typeof lesson.שם !== 'string') {
      warnings.push(`${courseName} - שיעור ${index + 1}: חסר שם שיעור`);
      lesson.שם = `שיעור ${index + 1}`;
    }

    if (!lesson.מצגת || typeof lesson.מצגת !== 'string') {
      warnings.push(`${courseName} - ${lesson.שם}: חסר שם מצגת`);
      lesson.מצגת = lesson.שם; // Use lesson name as fallback
    }

    // Validate topics array
    if (!Array.isArray(lesson.נושאים)) {
      warnings.push(`${courseName} - ${lesson.שם}: שדה "נושאים" חייב להיות מערך`);
      lesson.נושאים = [];
    } else {
      topicCount = lesson.נושאים.length;
      
      // Validate each topic
      lesson.נושאים.forEach((topic: any, topicIndex: number) => {
        const topicValidation = this.validateTopic(topic, topicIndex, lesson.שם);
        warnings.push(...topicValidation.warnings);
        goalCount += topicValidation.goalCount;
      });
    }

    return {
      warnings,
      topicCount,
      goalCount
    };
  }

  /**
   * Validate topic structure
   */
  private static validateTopic(
    topic: any,
    index: number,
    lessonName: string
  ): any {
    const warnings: string[] = [];
    let goalCount = 0;

    // Validate topic fields
    if (!topic.כותרת || typeof topic.כותרת !== 'string') {
      warnings.push(`${lessonName} - נושא ${index + 1}: חסר כותרת`);
      topic.כותרת = `נושא ${index + 1}`;
    }

    // Validate goals array
    if (!Array.isArray(topic.מטרות)) {
      warnings.push(`${lessonName} - ${topic.כותרת}: שדה "מטרות" חייב להיות מערך`);
      topic.מטרות = [];
    } else {
      goalCount = topic.מטרות.length;
      
      // Validate each goal
      topic.מטרות = topic.מטרות.map((goal: any) => {
        if (typeof goal === 'string') {
          return goal;
        } else if (goal && typeof goal === 'object' && goal.text) {
          return goal; // Complex goal with note
        } else {
          warnings.push(`${lessonName} - ${topic.כותרת}: מטרה לא תקינה`);
          return null;
        }
      }).filter((goal: any) => goal !== null);
    }

    // Validate completed goals
    if (!Array.isArray(topic.completedGoals)) {
      topic.completedGoals = [];
    } else {
      // Remove orphaned completed goals
      const goalTexts = topic.מטרות.map((g: any) => 
        typeof g === 'string' ? g : g.text
      );
      
      topic.completedGoals = topic.completedGoals.filter((completed: string) => {
        if (!goalTexts.includes(completed)) {
          warnings.push(
            `${lessonName} - ${topic.כותרת}: מטרה שהושלמה "${completed}" לא נמצאת ברשימת המטרות`
          );
          return false;
        }
        return true;
      });
    }

    return {
      warnings,
      goalCount
    };
  }

  /**
   * Deep copy with validation
   */
  static deepCopyWithValidation(data: any): any {
    try {
      // First, do a simple deep copy
      const copied = JSON.parse(JSON.stringify(data));
      
      // Then validate and fix any issues
      const validation = this.validateImportData(copied);
      
      if (!validation.valid) {
        console.error('Data validation failed:', validation.errors);
      }
      
      if (validation.warnings.length > 0) {
        console.warn('Data validation warnings:', validation.warnings);
      }
      
      return validation.processedData;
    } catch (error) {
      console.error('Deep copy failed:', error);
      return data; // Return original if copy fails
    }
  }

  /**
   * Calculate data size and check limits
   */
  static checkDataSize(courses: Course[]): {
    totalSize: number;
    courseSizes: { name: string; size: number; exceedsLimit: boolean }[];
    warnings: string[];
  } {
    const FIRESTORE_DOC_LIMIT = 1048576; // 1MB in bytes
    const SAFETY_MARGIN = 0.9; // Use 90% as safety threshold
    
    const result = {
      totalSize: 0,
      courseSizes: [] as any[],
      warnings: [] as string[]
    };

    courses.forEach(course => {
      const courseData = JSON.stringify(course);
      const size = new Blob([courseData]).size;
      const exceedsLimit = size > FIRESTORE_DOC_LIMIT * SAFETY_MARGIN;
      
      result.totalSize += size;
      result.courseSizes.push({
        name: course.קורס,
        size,
        exceedsLimit
      });
      
      if (exceedsLimit) {
        result.warnings.push(
          `⚠️ קורס "${course.קורס}" עלול לחרוג ממגבלת Firestore (${(size / 1024 / 1024).toFixed(2)}MB)`
        );
      }
    });

    return result;
  }
}

// Export to window for debugging
(window as any).importValidator = {
  validate: (data: any) => ImportValidator.validateImportData(data),
  checkSize: (courses: any) => ImportValidator.checkDataSize(courses),
  deepCopy: (data: any) => ImportValidator.deepCopyWithValidation(data),
  
  // Quick validation for imported file
  validateFile: async (file: File) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          const validation = ImportValidator.validateImportData(data, {
            checkForDuplicates: true,
            validateHebrewFields: true
          });
          
          console.log('📋 IMPORT VALIDATION RESULTS:');
          console.log(`Valid: ${validation.valid ? '✅' : '❌'}`);
          console.log(`Courses: ${validation.stats.courseCount}`);
          console.log(`Total Lessons: ${validation.stats.totalLessons}`);
          console.log(`Total Topics: ${validation.stats.totalTopics}`);
          console.log(`Total Goals: ${validation.stats.totalGoals}`);
          
          if (validation.errors.length > 0) {
            console.error('Errors:', validation.errors);
          }
          
          if (validation.warnings.length > 0) {
            console.warn('Warnings:', validation.warnings);
          }
          
          // Check data size
          const sizeCheck = ImportValidator.checkDataSize(validation.processedData);
          console.log(`\n📊 Data Size: ${(sizeCheck.totalSize / 1024 / 1024).toFixed(2)}MB`);
          sizeCheck.courseSizes.forEach(course => {
            console.log(`  ${course.name}: ${(course.size / 1024).toFixed(2)}KB ${
              course.exceedsLimit ? '⚠️ EXCEEDS LIMIT' : '✅'
            }`);
          });
          
          resolve(validation);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsText(file);
    });
  }
};

console.log(`
📥 IMPORT VALIDATOR LOADED 📥

Commands for validating imports:

importValidator.validate(data)     - Validate import data structure
importValidator.checkSize(courses) - Check data size limits
importValidator.deepCopy(data)     - Deep copy with validation

To validate a file:
1. const file = document.querySelector('input[type="file"]').files[0]
2. await importValidator.validateFile(file)
`);