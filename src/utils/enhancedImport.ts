import { ImportValidator } from './importValidator';
import { DeepDataDiagnostics } from './deepDataDiagnostics';
import type { Course } from '../types';

interface ImportResult {
  success: boolean;
  coursesImported: number;
  totalLessons: number;
  totalTopics: number;
  totalGoals: number;
  errors: string[];
  warnings: string[];
}

/**
 * Enhanced import functionality with complete data preservation
 */
export class EnhancedImport {
  /**
   * Import courses with full validation and verification
   */
  static async importCoursesWithVerification(
    jsonData: string | object,
    options: {
      replaceExisting?: boolean;
      validateBeforeSave?: boolean;
      forceDeepSync?: boolean;
    } = {}
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      coursesImported: 0,
      totalLessons: 0,
      totalTopics: 0,
      totalGoals: 0,
      errors: [],
      warnings: []
    };

    try {
      // Step 1: Parse JSON if needed
      console.log('📥 Starting enhanced import...');
      const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;

      // Step 2: Validate import data
      console.log('🔍 Validating import data...');
      const validation = ImportValidator.validateImportData(data, {
        enforceMinLessons: 1,
        enforceMinTopics: 1,
        checkForDuplicates: true,
        validateHebrewFields: true
      });

      if (!validation.valid) {
        result.errors = validation.errors;
        result.warnings = validation.warnings;
        console.error('❌ Validation failed:', validation.errors);
        return result;
      }

      result.warnings = validation.warnings;

      // Step 3: Check data size limits
      console.log('📏 Checking data size limits...');
      const sizeCheck = ImportValidator.checkDataSize(validation.processedData);
      
      if (sizeCheck.warnings.length > 0) {
        result.warnings.push(...sizeCheck.warnings);
        console.warn('⚠️ Size warnings:', sizeCheck.warnings);
      }

      // Step 4: Create deep copy to prevent reference issues
      console.log('📋 Creating deep copy of data...');
      const coursesToImport = ImportValidator.deepCopyWithValidation(validation.processedData);

      // Step 5: Get existing courses if not replacing
      let finalCourses: Course[] = [];
      
      if (!options.replaceExisting) {
        const existingJson = localStorage.getItem('studyDashboardCourses');
        const existingCourses = existingJson ? JSON.parse(existingJson) : [];
        
        // Merge with existing, avoiding duplicates
        const existingIds = new Set(existingCourses.map((c: Course) => c.id));
        const newCourses = coursesToImport.filter((c: Course) => !existingIds.has(c.id));
        
        finalCourses = [...existingCourses, ...newCourses];
        console.log(`📊 Merging: ${existingCourses.length} existing + ${newCourses.length} new courses`);
      } else {
        finalCourses = coursesToImport;
        console.log(`📊 Replacing all with ${coursesToImport.length} courses`);
      }

      // Step 6: Save to localStorage
      console.log('💾 Saving to localStorage...');
      localStorage.setItem('studyDashboardCourses', JSON.stringify(finalCourses));

      // Step 7: Verify save
      console.log('✅ Verifying save...');
      const savedData = localStorage.getItem('studyDashboardCourses');
      if (!savedData) {
        result.errors.push('Failed to save to localStorage');
        return result;
      }

      const savedCourses = JSON.parse(savedData);
      
      // Step 8: Validate specific courses (e.g., כימיה אורגנית 1)
      const organicChem = savedCourses.find((c: any) => c.קורס === "כימיה אורגנית 1");
      if (organicChem) {
        console.log(`\n🎯 Verifying "כימיה אורגנית 1":`);
        console.log(`  Lessons: ${organicChem.שיעורים?.length || 0}`);
        
        if (organicChem.שיעורים && organicChem.שיעורים.length === 10) {
          console.log('  ✅ All 10 lessons preserved!');
        } else {
          console.error(`  ❌ Expected 10 lessons, found ${organicChem.שיעורים?.length || 0}`);
          result.warnings.push(`כימיה אורגנית 1: Expected 10 lessons, found ${organicChem.שיעורים?.length || 0}`);
        }
        
        // List all lessons
        organicChem.שיעורים?.forEach((lesson: any, i: number) => {
          console.log(`    ${i + 1}. ${lesson.שם} (${lesson.נושאים?.length || 0} topics)`);
        });
      }

      // Step 9: Calculate final statistics
      savedCourses.forEach((course: any) => {
        result.coursesImported++;
        result.totalLessons += course.שיעורים?.length || 0;
        
        course.שיעורים?.forEach((lesson: any) => {
          result.totalTopics += lesson.נושאים?.length || 0;
          
          lesson.נושאים?.forEach((topic: any) => {
            result.totalGoals += topic.מטרות?.length || 0;
          });
        });
      });

      // Step 10: Trigger Firebase sync if requested
      if (options.forceDeepSync) {
        console.log('🚀 Triggering deep sync to Firebase...');
        await DeepDataDiagnostics.forceDeepSync();
      }

      result.success = true;
      
      console.log('\n✅ IMPORT COMPLETED SUCCESSFULLY');
      console.log(`Courses: ${result.coursesImported}`);
      console.log(`Lessons: ${result.totalLessons}`);
      console.log(`Topics: ${result.totalTopics}`);
      console.log(`Goals: ${result.totalGoals}`);

      // Step 11: Reload the page to ensure UI updates
      if (options.replaceExisting) {
        console.log('🔄 Reloading page in 2 seconds...');
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }

    } catch (error) {
      console.error('❌ Import failed:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  /**
   * Import from file with enhanced validation
   */
  static async importFromFile(file: File, options: any = {}): Promise<ImportResult> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const jsonData = e.target?.result as string;
          const result = await this.importCoursesWithVerification(jsonData, options);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file);
    });
  }

  /**
   * Emergency recovery import
   */
  static async emergencyRecovery(): Promise<void> {
    console.log('🚨 EMERGENCY RECOVERY MODE');
    
    // Try to recover from various sources
    const sources = [
      'studyDashboardCourses',
      'studyDashboardBackup',
      'studyDashboardCoursesBackup'
    ];
    
    for (const source of sources) {
      const data = localStorage.getItem(source);
      if (data) {
        try {
          const courses = JSON.parse(data);
          console.log(`Found ${courses.length} courses in ${source}`);
          
          const result = await this.importCoursesWithVerification(courses, {
            replaceExisting: true,
            validateBeforeSave: true,
            forceDeepSync: true
          });
          
          if (result.success) {
            console.log(`✅ Recovered from ${source}`);
            return;
          }
        } catch (error) {
          console.error(`Failed to recover from ${source}:`, error);
        }
      }
    }
    
    console.error('❌ No recoverable data found');
  }
}

// Export to window for console access
(window as any).enhancedImport = {
  import: (data: any, options?: any) => 
    EnhancedImport.importCoursesWithVerification(data, options),
  
  importFile: (file: File, options?: any) => 
    EnhancedImport.importFromFile(file, options),
  
  recover: () => 
    EnhancedImport.emergencyRecovery(),
  
  // Helper to get file from input
  importFromInput: async () => {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (!input?.files?.[0]) {
      console.error('No file selected');
      return;
    }
    
    const result = await EnhancedImport.importFromFile(input.files[0], {
      replaceExisting: confirm('Replace all existing data?'),
      validateBeforeSave: true,
      forceDeepSync: confirm('Force sync to Firebase?')
    });
    
    return result;
  }
};

console.log(`
🚀 ENHANCED IMPORT LOADED 🚀

Commands for safe data import:

enhancedImport.import(data, options)     - Import with validation
enhancedImport.importFile(file, options) - Import from file
enhancedImport.recover()                 - Emergency recovery
enhancedImport.importFromInput()         - Import from file input

Options:
- replaceExisting: Replace all data (default: false)
- validateBeforeSave: Validate before saving (default: true)  
- forceDeepSync: Force Firebase sync (default: false)

Example:
1. Select file in import dialog
2. Run: await enhancedImport.importFromInput()
`);