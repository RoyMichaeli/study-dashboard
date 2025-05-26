import { useState, useEffect } from 'react'
import './index.css'
import { AuthWrapper } from './components/AuthWrapper'
// import { SyncIndicator } from './components/SyncIndicator' // Replaced with SyncStatus
import { SyncStatus } from './components/SyncStatus'
import { EnhancedSyncStatus } from './components/EnhancedSyncStatus'
import { FirebaseFirstNotification } from './components/FirebaseFirstNotification'
import { useCloudSync } from './hooks/useAdaptiveCloudSync' // Now uses adaptive version
import { debugFirebaseData } from './utils/debugFirebase'
import './utils/syncDiagnostics' // Load diagnostics commands
import './utils/manualSyncBridge' // Load sync bridge commands
import './utils/firebaseFirstMode' // Load Firebase-first mode commands
import './utils/masterDiagnostics' // Load master diagnostics for data loss debugging
import './utils/dataBackupManager' // Load backup manager for data protection
import './utils/immediateBackup' // Run immediate backup and protection
import './utils/firebaseQuotaFix' // Fix for Firebase quota issues
import './utils/localFirstSync' // Local-first sync mode
import './utils/manualSyncConfig' // Manual sync configuration
import './utils/activateManualSync' // Auto-activate manual sync
import './utils/claudeIntegration' // Claude AI integration
import './utils/claudeExamples' // Claude examples and templates
import { ManualSyncButton } from './components/ManualSyncButton'
import { ClaudeButton } from './components/ClaudeButton'
import { useManualSync } from './hooks/useManualSync'
import { featureFlags } from './utils/featureFlags' // Feature flags

// קבועים לטיימר פומודורו
const WORK_TIME = 25 * 60      // 25 דקות עבודה
const SHORT_BREAK = 5 * 60     // 5 דקות הפסקה
const LONG_BREAK = 15 * 60     // 15 דקות הפסקה ארוכה
const SESSIONS_UNTIL_LONG_BREAK = 4
const DAILY_GOAL_MINUTES = 120 // 2 שעות ביום
const SESSIONS_KEY = 'studyDashboardSessions'

// נתונים לדוגמה עם המבנה החדש
const sampleCourses = [
  {
    id: 1,
    קורס: "כימיה אורגנית 1",
    שיעורים: [
      {
        שם: "שיעור אלקאנים א'",
        מצגת: "אלקאנים חלק א'",
        נושאים: [
          {
            כותרת: "מושגי יסוד וטרמינולוגיה",
            מטרות: [
              "הגדרת אלקאנים והנוסחה הכללית CₙH₂ₙ₊₂",
              "הבנה שאלקאנים הם פחמימנים רוויים",
              "הכרת המבנה הטטראדרלי סביב כל אטום פחמן"
            ],
            completedGoals: ["הגדרת אלקאנים והנוסחה הכללית CₙH₂ₙ₊₂"]
          }
        ]
      },
      {
        שם: "שיעור אלקאנים ב'",
        מצגת: "אלקאנים חלק ב'",
        נושאים: [
          {
            כותרת: "נומנקלטורה של אלקאנים",
            מטרות: [
              "שמות 12 האלקאנים הראשונים ונוסחאותיהם",
              "נוסחה כללית של קבוצת אלקיל: CₙH₂ₙ₊₁",
              "הכרת קבוצות אלקיל נפוצות"
            ],
            completedGoals: []
          }
        ]
      }
    ]
  },
  {
    id: 2,
    קורס: "מבני נתונים ואלגוריתמים",
    שיעורים: [
      {
        שם: "מערכים ורשימות",
        מצגת: "מבני נתונים בסיסיים",
        נושאים: [
          {
            כותרת: "מערכים",
            מטרות: [
              "הגדרת מערך",
              "פעולות על מערכים",
              "מורכבות זמן"
            ],
            completedGoals: ["הגדרת מערך"]
          }
        ]
      }
    ]
  },
  {
    id: 3,
    קורס: "כימיה פיזיקלית",
    שיעורים: [
      {
        שם: "תרמודינמיקה א'",
        מצגת: "החוקים הראשון והשני",
        נושאים: [
          {
            כותרת: "החוק הראשון של התרמודינמיקה",
            מטרות: [
              "הגדרת אנרגיה פנימית ועבודה",
              "משוואת החוק הראשון: ΔU = Q - W",
              "יישומים על תהליכים: איזותרמי, איזוכורי, איזובארי",
              "אנתלפיה ויחס לאנרגיה פנימית"
            ],
            completedGoals: []
          },
          {
            כותרת: "החוק השני של התרמודינמיקה",
            מטרות: [
              "הגדרת אנטרופיה ותכונותיה",
              "משוואת קלאוזיוס: dS ≥ δQ/T",
              "אנרגיה חופשית גיבס והלמהולץ",
              "שיווי משקל תרמודינמי"
            ],
            completedGoals: []
          }
        ]
      },
      {
        שם: "קינטיקה כימית",
        מצגת: "מהירות תגובה ומנגנונים",
        נושאים: [
          {
            כותרת: "חוקי מהירות",
            מטרות: [
              "הגדרת מהירות תגובה וחוק המהירות",
              "סדר תגובה וקבוע מהירות",
              "תגובות מסדר ראשון ושני",
              "זמן מחצית חיים"
            ],
            completedGoals: []
          },
          {
            כותרת: "תיאוריה של מהירות תגובה",
            מטרות: [
              "תיאורית המצב המעבר",
              "אנרגיית אקטיבציה ומשוואת ארהניוס",
              "קטליזה וההשפעה על מנגנון התגובה",
              "מנגנונים מורכבים ושלב קובע מהירות"
            ],
            completedGoals: []
          }
        ]
      },
      {
        שם: "מכניקה קוונטית",
        מצגת: "יסודות הקוונטים",
        נושאים: [
          {
            כותרת: "רקע היסטורי ועקרונות בסיסיים",
            מטרות: [
              "קרינת הגוף השחור ופלאנק",
              "אפקט פוטואלקטרי ואיינשטיין",
              "מודל בוהר לאטום המימן",
              "דואליות גל-חלקיק ודה ברולי"
            ],
            completedGoals: []
          }
        ]
      }
    ]
  },
  {
    id: 4,
    קורס: "כימיה פיזיקלית 2",
    שיעורים: [
      {
        שם: "שיווי משקל כימי",
        מצגת: "קבועי שיווי משקל ועקרון לה שאטלייה",
        נושאים: [
          {
            כותרת: "יסודות שיווי משקל כימי",
            מטרות: [
              "הגדרת שיווי משקל כימי ותכונותיו",
              "קבוע שיווי משקל Kc ו-Kp והקשר ביניהם",
              "כתיבת ביטויי שיווי משקל לתגובות שונות",
              "חישוב ריכוזי שיווי משקל באמצעות ICE tables",
              "השפעת תנאי התגובה על מיקום השיווי משקל"
            ],
            completedGoals: []
          },
          {
            כותרת: "עקרון לה שאטלייה",
            מטרות: [
              "ניסוח עקרון לה שאטלייה והבנת הרציונל שלו",
              "השפעת שינוי ריכוז על שיווי המשקל",
              "השפעת שינוי לחץ ונפח על שיווי המשקל",
              "השפעת שינוי טמפרטורה על שיווי המשקל",
              "תפקיד הקטליזטור בתגובות שיווי משקל"
            ],
            completedGoals: []
          }
        ]
      },
      {
        שם: "חומצות ובסיסים",
        מצגת: "תיאוריות חומצה-בסיס ו-pH",
        נושאים: [
          {
            כותרת: "תיאוריות חומצה-בסיס",
            מטרות: [
              "תיאורית ארהניוס לחומצות ובסיסים",
              "תיאורית ברנסטד-לאורי: תורמי ומקבלי פרוטונים",
              "תיאורית לואיס: תורמי ומקבלי זוגות אלקטרונים",
              "זיהוי זוגות חומצה-בסיס מצומדים",
              "חוזק יחסי של חומצות ובסיסים"
            ],
            completedGoals: []
          },
          {
            כותרת: "pH וחישובי חומצה-בסיס",
            מטרות: [
              "הגדרת pH, pOH ו-pKw והקשרים ביניהם",
              "חישוב pH של חומצות ובסיסים חזקים",
              "חישוב pH של חומצות ובסיסים חלשים",
              "חישוב pH של תמיסות חוצצות",
              "עקומות טיטרציה ונקודות שקילות"
            ],
            completedGoals: []
          }
        ]
      },
      {
        שם: "תופעות משטח",
        מצגת: "מתח פנים, אדסורפציה וקטליזה",
        נושאים: [
          {
            כותרת: "מתח פנים וזיווי מגע",
            מטרות: [
              "הגדרת מתח פנים ומקורו המולקולרי",
              "משוואת יאנג לזיווי מגע",
              "השפעת טמפרטורה על מתח פנים",
              "קפילריות וחוק יאנג-לפלס",
              "חומרים פעילי שטח ויישומיהם"
            ],
            completedGoals: []
          },
          {
            כותרת: "אדסורפציה",
            מטרות: [
              "הבחנה בין אדסורפציה לאבסורפציה",
              "איזותרם לנגמיר לאדסורפציה",
              "איזותרם BET לשטח פנים סגולי",
              "אדסורפציה פיזית מול כימית",
              "יישומי אדסורפציה בתעשייה"
            ],
            completedGoals: []
          }
        ]
      },
      {
        שם: "אלקטרוכימיה מתקדמת",
        מצגת: "תאים אלקטרוכימיים ותכונות אלקטרוליטים",
        נושאים: [
          {
            כותרת: "תאי דלק וסוללות",
            מטרות: [
              "עקרונות פעולה של תאי דלק מימני",
              "סוללות יון-ליתיום ומנגנון פעולתן",
              "יעילות אנרגטית של תאים אלקטרוכימיים",
              "קורוזיה אלקטרוכימית ושיטות מניעה",
              "יישומי אלקטרוליזה בתעשייה"
            ],
            completedGoals: []
          },
          {
            כותרת: "מוליכות אלקטרוליטית",
            מטרות: [
              "מוליכות מולרית ותלותה בריכוז",
              "חוק קולראוש למוליכות אלקטרוליטית",
              "מספרי הובלה יוניים",
              "אלקטרוליטים חזקים וחלשים",
              "פעילות יונית ומקדמי פעילות"
            ],
            completedGoals: []
          }
        ]
      }
    ]
  },
  {
    id: 5,
    קורס: "ביולוגיה של התא 2",
    שיעורים: [
      {
        שם: "מחזור התא וחלוקה",
        מצגת: "מיטוזה, מיוזה ובקרת מחזור התא",
        נושאים: [
          {
            כותרת: "שלבי מחזור התא",
            מטרות: [
              "שלב G1: גדילה וסינתזת חלבונים",
              "שלב S: שכפול DNA ושליטה בתהליך",
              "שלב G2: הכנה לחלוקה ובדיקת שלמות",
              "שלב M: מיטוזה וציטוקינזיס",
              "נקודות בקרה (checkpoints) במחזור התא"
            ],
            completedGoals: []
          },
          {
            כותרת: "מיטוזה ומיוזה",
            מטרות: [
              "שלבי המיטוזה: פרופאזה, מטאפאזה, אנאפאזה, טלופאזה",
              "ההבדלים בין מיטוזה למיוזה",
              "מיוזה I ו-II ותפקידן ביצירת גמטות",
              "הצלבות כרומוזומליות (crossing over)",
              "השפעת שגיאות בחלוקה על הצאצאים"
            ],
            completedGoals: []
          }
        ]
      },
      {
        שם: "גנטיקה מולקולרית",
        מצגת: "שכפול, תמלול ותרגום",
        נושאים: [
          {
            כותרת: "שכפול DNA",
            מטרות: [
              "מנגנון שכפול DNA והאנזימים המעורבים",
              "DNA פולימראז ותכונותיה",
              "שכפול הרצף המוביל והמעכב",
              "תיקון שגיאות במהלך השכפול",
              "טלומרים וטלומראז"
            ],
            completedGoals: []
          },
          {
            כותרת: "תמלול ועיבוד RNA",
            מטרות: [
              "יזום תמלול ותפקיד המקדמים (promoters)",
              "RNA פולימראז II ותמלול גנים",
              "עיבוד mRNA: הוספת cap ו-poly(A)",
              "קיצוץ אינטרונים (splicing) ואקסונים",
              "ויסות תמלול על ידי גורמי תמלול"
            ],
            completedGoals: []
          },
          {
            כותרת: "תרגום וסינתזת חלבונים",
            מטרות: [
              "מבנה הריבוזום ותפקידיו השונים",
              "יזום תרגום והכרת קודון ההתחלה",
              "הארכת שרשרת הפפטיד",
              "סיום תרגום וקודוני עצירה",
              "עיבוד חלבונים לאחר התרגום"
            ],
            completedGoals: []
          }
        ]
      },
      {
        שם: "מערכת הכלורופלסטים",
        מצגת: "פוטוסינתזה ומטבוליזם אנרגטי",
        נושאים: [
          {
            כותרת: "מבנה ותפקוד כלורופלסטים",
            מטרות: [
              "מבנה כלורופלסט: אמבלמה חיצונית ופנימית",
              "תילקוידים וגרנה: מקום התגובות התלויות באור",
              "סטרומה: מקום מחזור קלווין",
              "כלורופיל a ו-b ופיגמנטים נוספים",
              "מערכות פוטו I ו-II"
            ],
            completedGoals: []
          },
          {
            כותרת: "מחזור קלווין וקיבוע פחמן",
            מטרות: [
              "אנזים RuBisCO ותפקידו בקיבוע CO2",
              "שלבי מחזור קלווין: קיבוע, רדוקציה, רגנרציה",
              "יצירת G3P ויחס לייצור גלוקוז",
              "ויסות מחזור קלווין על ידי אור",
              "פוטו-נשימה ובעיות יעילות"
            ],
            completedGoals: []
          }
        ]
      },
      {
        שם: "מיטוכונדריה ונשימה תאית",
        מצגת: "מחזור קרבס ושרשרת הובלת אלקטרונים",
        נושאים: [
          {
            כותרת: "מבנה ותפקוד מיטוכונדריה",
            מטרות: [
              "מבנה מיטוכונדריה: ממברנה חיצונית ופנימית",
              "מטריקס ומרחב הבין-ממברנאלי",
              "כריסטות ותפקידן בהגדלת שטח הפנים",
              "DNA מיטוכונדריאלי ותיאורית האנדוסימביוזה",
              "בסינתזת ATP במיטוכונדריה"
            ],
            completedGoals: []
          },
          {
            כותרת: "מחזור קרבס ונשימה",
            מטרות: [
              "חמצון פירובט לאצטיל-CoA",
              "שלבי מחזור קרבס ותוצריו",
              "יצירת NADH, FADH2 ו-GTP",
              "שרשרת הובלת אלקטרונים וגרדיאנט פרוטונים",
              "סינתזת ATP על ידי ATP סינתאז"
            ],
            completedGoals: []
          }
        ]
      },
      {
        שם: "העברת אותות תאית",
        מצגת: "רצפטורים, מסרים שניים ותגובות תאיות",
        נושאים: [
          {
            כותרת: "סוגי רצפטורים ומסרים",
            מטרות: [
              "רצפטורים תוך-תאיים וחוץ-תאיים",
              "רצפטורי קינאז טירוזין (RTKs)",
              "רצפטורים הקשורים לחלבוני G",
              "רצפטורי יונים וערוצי יונים",
              "ליגנדים הידרופוביים והידרופיליים"
            ],
            completedGoals: []
          },
          {
            כותרת: "מסרים שניים ורשתות איתות",
            מטרות: [
              "cAMP ותפקידו כמסר שני",
              "IP3, DAG ויונים Ca2+ כמסרים שניים",
              "קסקדות פוספורילציה ודה-פוספורילציה",
              "הגברה ועיבוד אותות",
              "ויסות שלילי וחיובי של מסלולי איתות"
            ],
            completedGoals: []
          }
        ]
      }
    ]
  },
  {
    id: 6,
    קורס: "פיזיקה מכינה ב'",
    שיעורים: [
      {
        שם: "חשמל סטטי",
        מצגת: "מטענים וכוחות חשמליים",
        נושאים: [
          {
            כותרת: "חוק קולון ושדה חשמלי",
            מטרות: [
              "חוק קולון והכוח בין מטענים",
              "הגדרת שדה חשמלי ועוצמתו",
              "שדה חשמלי של מטען נקודתי",
              "עקרון הסופרפוזיציה לשדות",
              "קווי שדה וייצוגם"
            ],
            completedGoals: []
          },
          {
            כותרת: "פוטנציאל חשמלי",
            מטרות: [
              "הגדרת פוטנציאל חשמלי ויחידותיו",
              "הקשר בין שדה לפוטנציאל",
              "פוטנציאל של מטען נקודתי",
              "עבודה בשדה חשמלי",
              "אנרגיה פוטנציאלית חשמלית"
            ],
            completedGoals: []
          }
        ]
      },
      {
        שם: "זרם חשמלי",
        מצגת: "מעגלים ותכונות זרם",
        נושאים: [
          {
            כותרת: "זרם והתנגדות",
            מטרות: [
              "הגדרת זרם חשמלי ויחידותיו",
              "חוק אוהם: V = IR",
              "התנגדות והתנגדות סגולית",
              "השפעת טמפרטורה על התנגדות",
              "התנגדות פנימית של מקור מתח"
            ],
            completedGoals: []
          },
          {
            כותרת: "חוקי קירכהוף",
            מטרות: [
              "חוק קירכהוף הראשון (חוק הזרמים)",
              "חוק קירכהוף השני (חוק המתחים)",
              "פתרון מעגלים מורכבים",
              "חיבור התנגדויות בטור ובמקביל"
            ],
            completedGoals: []
          }
        ]
      },
      {
        שם: "מגנטיות",
        מצגת: "שדות מגנטיים וכוחות",
        נושאים: [
          {
            כותרת: "שדה מגנטי וכוח לורנץ",
            מטרות: [
              "הגדרת שדה מגנטי ויחידותיו",
              "כוח לורנץ על מטען נע",
              "תנועת מטען בשדה מגנטי אחיד",
              "כוח על זרם בשדה מגנטי",
              "מומנט על לולאת זרם"
            ],
            completedGoals: []
          },
          {
            כותרת: "חוק ביו-סבאר ואמפר",
            מטרות: [
              "חוק ביו-סבאר לשדה מגנטי",
              "שדה מגנטי של זרם ישר",
              "שדה מגנטי של לולאה עגולה",
              "חוק אמפר ויישומיו",
              "שדה מגנטי בתוך סולנואיד"
            ],
            completedGoals: []
          }
        ]
      },
      {
        שם: "אינדוקציה אלקטרומגנטית",
        מצגת: "חוק פאראדיי ולנץ",
        נושאים: [
          {
            כותרת: "חוק פאראדיי",
            מטרות: [
              "זרם השראה וחוק פאראדיי",
              "כלל לנץ לכיוון הזרם המושרה",
              "אינדוקציה הדדית ועצמית",
              "אנרגיה בשדה מגנטי",
              "גנרטורים ומנועים"
            ],
            completedGoals: []
          }
        ]
      }
    ]
  }
]

function App() {
  const [currentView, setCurrentView] = useState<'courses' | 'lessons' | 'lesson-detail'>('courses')
  const [showFirebaseFirstModal, setShowFirebaseFirstModal] = useState(false)
  
  // Initialize Firebase-first mode on app start
  useEffect(() => {
    // Check if localStorage quota is exceeded and enable Firebase-first mode
    const checkAndEnableFirebaseFirst = async () => {
      // Import Firebase-first utilities
      const { FirebaseFirstMode } = await import('./utils/firebaseFirstMode');
      
      // Check if user has seen the notification
      const hasSeenNotification = localStorage.getItem('firebaseFirstNotificationSeen')
      
      // Check storage quota status
      if (!FirebaseFirstMode.checkQuotaStatus()) {
        console.log('🚨 localStorage quota exceeded - enabling Firebase-first mode');
        FirebaseFirstMode.enableFirebaseFirst();
        if (!hasSeenNotification) {
          setShowFirebaseFirstModal(true)
        }
      } else {
        console.log('🔥 Enabling Firebase-first mode - Firebase is single source of truth');
        FirebaseFirstMode.enableFirebaseFirst();
        if (!hasSeenNotification) {
          setShowFirebaseFirstModal(true)
        }
      }
    };
    
    checkAndEnableFirebaseFirst();
  }, []);
  
  // טוען נתונים שמורים או נתוני דוגמה
  // This function has been moved to useCloudSync hook
  
  // עכשיו מגיע מ-useCloudSync במקום state מקומי
  // const [courses, setCourses] = useState(loadSavedCourses)
  
  // Remove unused functions to fix TypeScript errors
  // const loadSavedCourses = () => { ... }
  // const getTodayStudyTime = () => { ... }
  // const getWeekStudyTime = () => { ... }
  const [currentCourse, setCurrentCourse] = useState<any>(null)
  const [currentLesson, setCurrentLesson] = useState<any>(null)
  const [newCourseText, setNewCourseText] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newLessonText, setNewLessonText] = useState('')
  const [showAddLessonForm, setShowAddLessonForm] = useState(false)
  const [editingCourse, setEditingCourse] = useState<any>(null)
  const [editingLesson, setEditingLesson] = useState<any>(null)
  const [editCourseText, setEditCourseText] = useState('')
  const [editLessonText, setEditLessonText] = useState('')
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved')
  const [editingGoalNote, setEditingGoalNote] = useState<{topicIndex: number, goalText: string} | null>(null)
  const [tempNoteText, setTempNoteText] = useState('')

  // משתני state לטיימר פומודורו
  const [timerState, setTimerState] = useState<'idle' | 'working' | 'break'>('idle')
  const [timeLeft, setTimeLeft] = useState(WORK_TIME)
  const [isRunning, setIsRunning] = useState(false)
  const [currentSession, setCurrentSession] = useState<{
    courseId?: number
    lessonName?: string
    topicTitle?: string
    startTime?: Date
    sessionCount?: number
  }>({})
  const [todayCompletedSessions, setTodayCompletedSessions] = useState(0)

  // אינטגרציית Firebase Cloud Sync
  const { 
    courses, 
    saveCourses: cloudSaveCourses, 
    saveStudySession: cloudSaveStudySession,
    // deleteCourse: cloudDeleteCourse,
    // deleteStudySession: cloudDeleteStudySession,
    syncState,
    syncQueueStatus,
    forceSync,
    user,
    getSyncMetadata
  } = useCloudSync() as any // Type assertion for enhanced features
  
  // אינטגרציית סנכרון ידני
  const { saveLocalOnly, markLocalChange } = useManualSync()
  
  // בחירת פונקציית שמירה לפי מצב הסנכרון
  const isManualSyncMode = localStorage.getItem('syncMode') === 'manual'
  const saveCourses = isManualSyncMode ? saveLocalOnly : cloudSaveCourses

  // פונקציות עזר לטיימר
  const playNotificationSound = () => {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+KVaOiDTAdZAkGZTRLiVCKF8OdwCyRNKGGLEJQYUpzIYBhNB1wWzNkOQCVaTEHhkEAMtN+KJRNBaIlIzYtO2NvLWeFP4cVPaRZM8YiNx4SBZaRZzgKKaZhFFUbGUfNRlGbPYNdZAoHWFAKQgBdIKUbGHFWO2t8REptQktsZFQ9gBmDZ3F0YENOZhQOSbQpSQkNFJI3SU5VULPYKVkkW3QIHG5sJR3EaDNpWUtfNZPYpVNSYX1wGbTEpWfJPJQ5UlksGcKKjCdgMlFrUyNdQKk8VHpPf2jQJi1tMyVQI3l5Z0FnVVdjbFt3KlVdTZA3YykQXFc=')
    audio.play().catch(() => {}) // התעלם מאירוע אם אין הרשאה
  }

  const showNotification = (title: string, body: string) => {
    if (Notification.permission === 'granted') {
      new Notification(title, { body })
    }
  }

  const saveStudySession = async (session: any) => {
    // שמירה מקומית מיידית
    const sessions = JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]')
    sessions.push(session)
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
    console.log('💾 נשמר סשן חדש:', session)
    
    // שמירה בענן
    try {
      await cloudSaveStudySession(session)
      console.log('☁️ סשן נשמר בענן:', session)
    } catch (error) {
      console.error('שגיאה בשמירת סשן בענן:', error)
    }
    
    // עדכן סטטיסטיקות מיד אחרי השמירה
    setTimeout(() => {
      updateTodayStats()
    }, 100)
  }

  const getSessionsHistory = () => {
    return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]')
  }

  // פונקציה עזר לעדכון סטטיסטיקות
  const updateTodayStats = () => {
    try {
      const sessions = getSessionsHistory()
      const today = new Date().toDateString()
      
      console.log('📊 מעדכן סטטיסטיקות היום:', { 
        totalSessions: sessions.length, 
        today,
        sessions: sessions.slice(-5) // הצגת 5 הסשנים האחרונים לדיבוג
      })
      
      const todaySessions = sessions.filter((session: any) => {
        if (!session.startTime) return false
        const sessionDate = new Date(session.startTime).toDateString()
        return session.type === 'work' && 
               session.completed && 
               sessionDate === today
      })
      
      console.log('📊 סשנים של היום:', todaySessions)
      
      setTodayCompletedSessions(todaySessions.length)
      
      // חישוב זמן לימוד יומי (בשניות)
      const totalTime = todaySessions.reduce((total: number, session: any) => {
        const duration = session.duration || 0
        return total + duration
      }, 0)
      
      console.log('📊 זמן לימוד כולל:', { totalTimeSeconds: totalTime, totalTimeMinutes: Math.floor(totalTime / 60) })
      
      setTodayStudyTime(totalTime)
    } catch (error) {
      console.error('❌ שגיאה בעדכון סטטיסטיקות היום:', error)
    }
  }

  // שמירה אוטומטית בכל שינוי
  // שמירה אוטומטית - עכשיו מטופלת ע"י useCloudSync
  // useEffect(() => {
  //   setSaveStatus('saving')
  //   const saveTimeout = setTimeout(() => {
  //     try {
  //       localStorage.setItem('studyDashboardCourses', JSON.stringify(courses))
  //       setSaveStatus('saved')
  //     } catch (error) {
  //       console.error('שגיאה בשמירת נתונים:', error)
  //       setSaveStatus('error')
  //     }
  //   }, 500) // שמירה עם השהיה קטנה
  //   
  //   return () => clearTimeout(saveTimeout)
  // }, [courses])

  // גיבוי אוטומטי תקופתי
  useEffect(() => {
    const autoBackup = setInterval(() => {
      if (courses.length > 0) {
        try {
          const timestamp = new Date().toISOString()
          const dataStr = JSON.stringify({
            timestamp,
            courses,
            metadata: {
              totalCourses: courses.length,
              totalLessons: courses.reduce((sum: number, course: any) => sum + course.שיעורים.length, 0)
            }
          })
          localStorage.setItem('studyDashboardLastBackup', dataStr)
          localStorage.setItem('studyDashboardBackupTime', timestamp)
          console.log('🔄 גיבוי אוטומטי בוצע בהצלחה')
        } catch (error) {
          console.error('❌ שגיאה בגיבוי אוטומטי:', error)
        }
      }
    }, 10 * 60 * 1000) // גיבוי כל 10 דקות

    return () => clearInterval(autoBackup)
  }, [courses])

  // useEffect לטיימר
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft => {
          if (timeLeft <= 1) {
            // הטיימר הסתיים - נטפל בזה כאן במקום לקרוא לפונקציה שעדיין לא הוגדרה
            return 0
          }
          return timeLeft - 1
        })
      }, 1000)
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, timeLeft])

  // כשהטיימר מגיע לאפס
  useEffect(() => {
    if (timeLeft === 0 && isRunning) {
      playNotificationSound()
      
      if (timerState === 'working') {
        // שמירת סשן הלימוד
        const sessionData = {
          id: Date.now().toString(),
          courseId: currentSession.courseId,
          lessonName: currentSession.lessonName,
          topicTitle: currentSession.topicTitle,
          startTime: currentSession.startTime,
          endTime: new Date(),
          duration: WORK_TIME,
          type: 'work',
          completed: true
        }
        saveStudySession(sessionData)
        
        const newSessionCount = (currentSession.sessionCount || 0) + 1
        const isLongBreak = newSessionCount % SESSIONS_UNTIL_LONG_BREAK === 0
        
        showNotification('פומודורו הושלם! 🎉', 
          isLongBreak ? 'זמן להפסקה ארוכה' : 'זמן להפסקה קצרה')
        
        setTimerState('break')
        setTimeLeft(isLongBreak ? LONG_BREAK : SHORT_BREAK)
        setCurrentSession(prev => ({ ...prev, sessionCount: newSessionCount }))
        
        // עדכון סטטיסטיקות
        updateTodayStats()
      } else {
        showNotification('הפסקה הסתיימה! 💪', 'בואו נמשיך ללמוד')
        setTimerState('idle')
        setTimeLeft(WORK_TIME)
        setIsRunning(false)
        setCurrentSession({})
      }
    }
  }, [timeLeft, isRunning, timerState, currentSession])

  // בקש הרשאות התראה בטעינה
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
    
    // טען סטטיסטיקות היום
    updateTodayStats()
  }, [])

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === ' ') { // Ctrl + Space
        e.preventDefault()
        if (isRunning) {
          pauseTimer()
        } else {
          startTimer()
        }
      }
    }
    
    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [isRunning])

  // Page Visibility API
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isRunning) {
        // שמור זמן יציאה
        localStorage.setItem('timerLeftTime', timeLeft.toString())
        localStorage.setItem('timerLeftAt', Date.now().toString())
      } else if (!document.hidden && isRunning) {
        // חזור לטיימר
        const leftAt = localStorage.getItem('timerLeftAt')
        if (leftAt) {
          const elapsed = Math.floor((Date.now() - parseInt(leftAt)) / 1000)
          const remainingTime = Math.max(0, timeLeft - elapsed)
          setTimeLeft(remainingTime)
        }
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [isRunning, timeLeft])

  // פונקציות ניהול נתונים
  const exportData = () => {
    try {
      const timestamp = new Date().toISOString().split('T')[0]
      const dataStr = JSON.stringify(courses, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `study-dashboard-backup-${timestamp}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      alert('נתונים יוצאו בהצלחה!')
    } catch (error) {
      alert('שגיאה בייצוא הנתונים')
    }
  }

  // גיבוי אוטומטי ל-GitHub Gist
  const saveToGitHubGist = async () => {
    const githubToken = localStorage.getItem('githubToken')
    if (!githubToken) {
      const token = prompt('הזן GitHub Personal Access Token (עם הרשאת gist):')
      if (!token) return
      localStorage.setItem('githubToken', token)
    }

    try {
      const timestamp = new Date().toISOString()
      const dataStr = JSON.stringify(courses, null, 2)
      
      const response = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: {
          'Authorization': `token ${githubToken || localStorage.getItem('githubToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: `Study Dashboard Backup - ${timestamp}`,
          public: false,
          files: {
            [`study-dashboard-backup-${timestamp.split('T')[0]}.json`]: {
              content: dataStr
            }
          }
        })
      })

      if (response.ok) {
        const gist = await response.json()
        localStorage.setItem('lastGistUrl', gist.html_url)
        alert(`✅ נתונים נשמרו ב-GitHub!\n🔗 ${gist.html_url}`)
      } else {
        throw new Error('Failed to create gist')
      }
    } catch (error) {
      console.error('Error saving to GitHub:', error)
      alert('❌ שגיאה בשמירה ל-GitHub. בדוק את ה-Token')
    }
  }

  // גיבוי חכם לענן
  const saveToCloud = () => {
    try {
      const timestamp = new Date().toISOString()
      const dataStr = JSON.stringify({
        timestamp,
        courses,
        metadata: {
          totalCourses: courses.length,
          totalLessons: courses.reduce((sum: number, course: any) => sum + course.שיעורים.length, 0),
          version: '1.0'
        }
      }, null, 2)
      
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `study-dashboard-cloud-backup-${timestamp.split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      // שמירה ב-localStorage כגיבוי נוסף
      localStorage.setItem('studyDashboardLastBackup', dataStr)
      localStorage.setItem('studyDashboardBackupTime', timestamp)
      
      alert('✅ גיבוי הושלם! הקובץ הורד ונשמר גם כגיבוי מקומי')
    } catch (error) {
      alert('❌ שגיאה ביצירת גיבוי')
    }
  }

  // שחזור מגיבוי
  const restoreFromBackup = () => {
    const backup = localStorage.getItem('studyDashboardLastBackup')
    if (!backup) {
      alert('❌ לא נמצא גיבוי מקומי')
      return
    }

    try {
      const backupData = JSON.parse(backup)
      const backupTime = localStorage.getItem('studyDashboardBackupTime')
      
      if (confirm(`האם לשחזר מגיבוי מ-${backupTime ? new Date(backupTime).toLocaleString('he-IL') : 'תאריך לא ידוע'}?`)) {
        saveCourses(backupData.courses || backupData) // תמיכה בפורמטים שונים
        alert('✅ נתונים שוחזרו מגיבוי!')
      }
    } catch (error) {
      alert('❌ שגיאה בשחזור מגיבוי')
    }
  }

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string)
        if (Array.isArray(importedData) && importedData.length > 0) {
          if (confirm('האם אתה בטוח שרוצה להחליף את כל הנתונים הקיימים?')) {
            saveCourses(importedData)
            alert('נתונים יובאו בהצלחה!')
          }
        } else {
          alert('קובץ לא תקין')
        }
      } catch (error) {
        alert('שגיאה בקריאת הקובץ')
      }
    }
    reader.readAsText(file)
    event.target.value = '' // איפוס ה-input
  }

  const resetData = () => {
    if (confirm('האם אתה בטוח שרוצה למחוק את כל הנתונים ולהתחיל מחדש?')) {
      if (confirm('זו פעולה בלתי הפיכה! האם אתה בטוח?')) {
        localStorage.removeItem('studyDashboardCourses')
        saveCourses(sampleCourses)
        setCurrentCourse(null)
        setCurrentLesson(null)
        setCurrentView('courses')
        setSaveStatus('saved')
        alert('הנתונים אופסו בהצלחה!')
      }
    }
  }

  const forceLoadSampleData = () => {
    if (confirm('האם אתה רוצה לטעון את נתוני הדוגמה?')) {
      saveCourses(sampleCourses)
      setCurrentCourse(null)
      setCurrentLesson(null)
      setCurrentView('courses')
      setSaveStatus('saved')
      alert('נתוני הדוגמה נטענו בהצלחה!')
    }
  }
  
  const toggleGoal = (topicIndex: number, goalText: string) => {
    if (!currentLesson) return
    
    const updatedTopics = [...currentLesson.נושאים]
    const topic = updatedTopics[topicIndex]
    
    if (topic.completedGoals.includes(goalText)) {
      topic.completedGoals = topic.completedGoals.filter((g: string) => g !== goalText)
    } else {
      topic.completedGoals.push(goalText)
    }
    
    const updatedLesson = { ...currentLesson, נושאים: updatedTopics }
    setCurrentLesson(updatedLesson)
    
    // עדכון גם במאגר הנתונים
    const updatedCourses = courses.map(course => {
      if (course.id === currentCourse.id) {
        const updatedLessons = course.שיעורים.map((lesson: any) => 
          lesson.שם === currentLesson.שם ? updatedLesson : lesson
        )
        return { ...course, שיעורים: updatedLessons }
      }
      return course
    })
    saveCourses(updatedCourses)
    
    // עדכון הקורס הנוכחי
    const updatedCurrentCourse = updatedCourses.find(c => c.id === currentCourse.id)
    setCurrentCourse(updatedCurrentCourse)
  }
  
  const addNewCourse = () => {
    try {
      const newCourse = JSON.parse(newCourseText)
      if (newCourse.קורס && newCourse.שיעורים) {
        const courseWithId = {
          id: Date.now(),
          ...newCourse,
          שיעורים: newCourse.שיעורים.map((lesson: any) => ({
            ...lesson,
            נושאים: lesson.נושאים.map((topic: any) => ({
              ...topic,
              completedGoals: topic.completedGoals || []
            }))
          }))
        }
        saveCourses([...courses, courseWithId])
        setNewCourseText('')
        setShowAddForm(false)
        alert('קורס נוסף בהצלחה!')
      } else {
        alert('JSON חייב לכלול "קורס" ו"שיעורים"')
      }
    } catch (error) {
      alert('JSON לא תקין')
    }
  }

  const addNewLesson = () => {
    try {
      const newLesson = JSON.parse(newLessonText)
      if (newLesson.שם && newLesson.מצגת && newLesson.נושאים) {
        const lessonWithDefaults = {
          ...newLesson,
          נושאים: newLesson.נושאים.map((topic: any) => ({
            ...topic,
            completedGoals: topic.completedGoals || []
          }))
        }
        
        const updatedCourses = courses.map(course => {
          if (course.id === currentCourse.id) {
            return {
              ...course,
              שיעורים: [...course.שיעורים, lessonWithDefaults]
            }
          }
          return course
        })
        
        saveCourses(updatedCourses)
        setCurrentCourse(updatedCourses.find(c => c.id === currentCourse.id))
        setNewLessonText('')
        setShowAddLessonForm(false)
        alert('שיעור נוסף בהצלחה!')
      } else {
        alert('JSON חייב לכלול "שם", "מצגת" ו"נושאים"')
      }
    } catch (error) {
      alert('JSON לא תקין')
    }
  }

  // פונקציות מחיקה ועריכה
  const deleteCourse = (courseId: number) => {
    if (confirm('האם אתה בטוח שרוצה למחוק את הקורס?')) {
      saveCourses(courses.filter(course => course.id !== courseId))
      alert('קורס נמחק בהצלחה!')
    }
  }

  const deleteLesson = (lessonName: string) => {
    if (confirm('האם אתה בטוח שרוצה למחוק את השיעור?')) {
      const updatedCourses = courses.map(course => {
        if (course.id === currentCourse.id) {
          return {
            ...course,
            שיעורים: course.שיעורים.filter((lesson: any) => lesson.שם !== lessonName)
          }
        }
        return course
      })
      saveCourses(updatedCourses)
      setCurrentCourse(updatedCourses.find(c => c.id === currentCourse.id))
      alert('שיעור נמחק בהצלחה!')
    }
  }

  const startEditCourse = (course: any) => {
    setEditingCourse(course)
    setEditCourseText(JSON.stringify({
      קורס: course.קורס,
      שיעורים: course.שיעורים
    }, null, 2))
  }

  const startEditLesson = (lesson: any) => {
    setEditingLesson(lesson)
    setEditLessonText(JSON.stringify({
      שם: lesson.שם,
      מצגת: lesson.מצגת,
      נושאים: lesson.נושאים
    }, null, 2))
  }

  const saveEditCourse = () => {
    try {
      const editedCourse = JSON.parse(editCourseText)
      if (editedCourse.קורס && editedCourse.שיעורים) {
        const updatedCourses = courses.map(course => {
          if (course.id === editingCourse.id) {
            return {
              ...course,
              קורס: editedCourse.קורס,
              שיעורים: editedCourse.שיעורים.map((lesson: any) => ({
                ...lesson,
                נושאים: lesson.נושאים.map((topic: any) => ({
                  ...topic,
                  completedGoals: topic.completedGoals || []
                }))
              }))
            }
          }
          return course
        })
        saveCourses(updatedCourses)
        setEditingCourse(null)
        setEditCourseText('')
        alert('קורס עודכן בהצלחה!')
      } else {
        alert('JSON חייב לכלול "קורס" ו"שיעורים"')
      }
    } catch (error) {
      alert('JSON לא תקין')
    }
  }

  const saveEditLesson = () => {
    try {
      const editedLesson = JSON.parse(editLessonText)
      if (editedLesson.שם && editedLesson.מצגת && editedLesson.נושאים) {
        const updatedCourses = courses.map(course => {
          if (course.id === currentCourse.id) {
            return {
              ...course,
              שיעורים: course.שיעורים.map((lesson: any) => 
                lesson.שם === editingLesson.שם ? {
                  ...editedLesson,
                  נושאים: editedLesson.נושאים.map((topic: any) => ({
                    ...topic,
                    completedGoals: topic.completedGoals || []
                  }))
                } : lesson
              )
            }
          }
          return course
        })
        saveCourses(updatedCourses)
        setCurrentCourse(updatedCourses.find(c => c.id === currentCourse.id))
        setEditingLesson(null)
        setEditLessonText('')
        alert('שיעור עודכן בהצלחה!')
      } else {
        alert('JSON חייב לכלול "שם", "מצגת" ו"נושאים"')
      }
    } catch (error) {
      alert('JSON לא תקין')
    }
  }

  const getCourseProgress = (course: any) => {
    const totalGoals = course.שיעורים.reduce((sum: number, lesson: any) => 
      sum + lesson.נושאים.reduce((topicSum: number, topic: any) => {
        // תומך במבנה חדש וישן של מטרות
        return topicSum + (Array.isArray(topic.מטרות) ? topic.מטרות.length : 0)
      }, 0), 0)
    
    const completedGoals = course.שיעורים.reduce((sum: number, lesson: any) => 
      sum + lesson.נושאים.reduce((topicSum: number, topic: any) => 
        topicSum + (topic.completedGoals?.length || 0), 0), 0)
    
    return totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0
  }

  const getLessonProgress = (lesson: any) => {
    const totalGoals = lesson.נושאים.reduce((sum: number, topic: any) => {
      // תומך במבנה חדש וישן של מטרות
      return sum + (Array.isArray(topic.מטרות) ? topic.מטרות.length : 0)
    }, 0)
    const completedGoals = lesson.נושאים.reduce((sum: number, topic: any) => sum + (topic.completedGoals?.length || 0), 0)
    return totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0
  }

  // פונקציה עזר לטיפול במטרות - תומכת גם במבנה הישן (מחרוזות) וגם במבנה החדש (אובייקטים)
  const normalizeGoal = (goal: any) => {
    if (typeof goal === 'string') {
      return { text: goal, note: '' }
    }
    return { text: goal.text || goal, note: goal.note || '' }
  }

  const normalizeGoals = (goals: any[]) => {
    return goals.map(normalizeGoal)
  }

  // פונקציה עזר לעדכון הערה של מטרה
  const updateGoalNote = (topicIndex: number, goalText: string, note: string) => {
    if (!currentLesson) return
    
    const updatedTopics = [...currentLesson.נושאים]
    const topic = updatedTopics[topicIndex]
    
    // ממיר את המטרות לפורמט החדש אם הן עדיין במבנה הישן
    const normalizedGoals = normalizeGoals(topic.מטרות)
    
    // מעדכן את ההערה של המטרה הספציפית
    const updatedGoals = normalizedGoals.map(goal => 
      goal.text === goalText 
        ? { ...goal, note } 
        : goal
    )
    
    topic.מטרות = updatedGoals
    
    const updatedLesson = { ...currentLesson, נושאים: updatedTopics }
    setCurrentLesson(updatedLesson)
    
    // עדכון גם במאגר הנתונים
    const updatedCourses = courses.map(course => {
      if (course.id === currentCourse.id) {
        const updatedLessons = course.שיעורים.map((lesson: any) => 
          lesson.שם === currentLesson.שם ? updatedLesson : lesson
        )
        return { ...course, שיעורים: updatedLessons }
      }
      return course
    })
    saveCourses(updatedCourses)
    
    // עדכון הקורס הנוכחי
    const updatedCurrentCourse = updatedCourses.find(c => c.id === currentCourse.id)
    setCurrentCourse(updatedCurrentCourse)
  }

  // משתנה state לזמן לימוד יומי
  const [todayStudyTime, setTodayStudyTime] = useState(0)
  
  // Helper function to render appropriate sync status
  const renderSyncStatus = () => {
    const isEnhanced = featureFlags.isEnabled('enhancedFirebaseSync')
    const Component = isEnhanced ? EnhancedSyncStatus : SyncStatus
    
    return (
      <Component
        syncState={syncState}
        syncQueueStatus={syncQueueStatus}
        onForceSync={forceSync}
        userName={user?.displayName || user?.email}
        getSyncMetadata={getSyncMetadata}
      />
    )
  }

  // פונקציות נוספות לטיימר
  // Study time calculation functions removed - can be restored if needed

  // Week study stats function removed - inline calculation used instead

  const startTimer = (courseId?: number, lessonName?: string, topicTitle?: string) => {
    if (timerState === 'idle') {
      setTimerState('working')
      setTimeLeft(WORK_TIME)
      setCurrentSession({
        courseId,
        lessonName,
        topicTitle,
        startTime: new Date(),
        sessionCount: currentSession.sessionCount || 0
      })
    }
    setIsRunning(true)
  }

  const pauseTimer = () => {
    setIsRunning(false)
  }

  const resetTimer = () => {
    setIsRunning(false)
    setTimerState('idle')
    setTimeLeft(WORK_TIME)
    setCurrentSession({})
  }

  const completeSession = () => {
    if (timerState === 'working' && isRunning) {
      // עצור את הטיימר
      setIsRunning(false)
      playNotificationSound()
      
      // חישוב זמן לימוד בפועל (כמה זמן עבר מתחילת הסשן)
      const actualDuration = WORK_TIME - timeLeft
      
      // שמירת סשן הלימוד
      const sessionData = {
        id: Date.now().toString(),
        courseId: currentSession.courseId,
        lessonName: currentSession.lessonName,
        topicTitle: currentSession.topicTitle,
        startTime: currentSession.startTime,
        endTime: new Date(),
        duration: actualDuration, // הזמן שבפועל לומדו
        type: 'work',
        completed: true
      }
      saveStudySession(sessionData)
      
      const newSessionCount = (currentSession.sessionCount || 0) + 1
      const isLongBreak = newSessionCount % SESSIONS_UNTIL_LONG_BREAK === 0
      
      showNotification('פומודורו הושלם ידנית! 🎉', 
        isLongBreak ? 'זמן להפסקה ארוכה' : 'זמן להפסקה קצרה')
      
      setTimerState('break')
      setTimeLeft(isLongBreak ? LONG_BREAK : SHORT_BREAK)
      setCurrentSession(prev => ({ ...prev, sessionCount: newSessionCount }))
      
      // עדכון סטטיסטיקות
      updateTodayStats()
    }
  }

  // 1️⃣ תצוגת רשימת קורסים (עמוד ראשי)
  if (currentView === 'courses') {
    return (
      <AuthWrapper>
        {showFirebaseFirstModal && (
          <FirebaseFirstNotification
            onConfirm={() => setShowFirebaseFirstModal(false)}
          />
        )}
        {renderSyncStatus()}
        <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold text-gray-800">🎓 דשבורד לימודים</h1>
              {/* Debug button - remove in production */}
              {process.env.NODE_ENV === 'development' && (
                <button
                  onClick={() => debugFirebaseData()}
                  className="px-2 py-1 bg-red-500 text-white text-xs rounded"
                >
                  Debug Firebase
                </button>
              )}
              <div className={`text-sm px-3 py-1 rounded-full ${
                saveStatus === 'saved' ? 'text-green-700 bg-green-100' :
                saveStatus === 'saving' ? 'text-yellow-700 bg-yellow-100' :
                'text-red-700 bg-red-100'
              }`}>
                {saveStatus === 'saved' && '💾 נשמר'}
                {saveStatus === 'saving' && '⏳ שומר...'}
                {saveStatus === 'error' && '❌ שגיאה'}
              </div>
              
              {/* מחוון גיבוי אחרון */}
              {(() => {
                const lastBackupTime = localStorage.getItem('studyDashboardBackupTime')
                if (lastBackupTime) {
                  const timeDiff = Date.now() - new Date(lastBackupTime).getTime()
                  const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60))
                  const minutesAgo = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
                  
                  return (
                    <div className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700" title={`גיבוי אחרון: ${new Date(lastBackupTime).toLocaleString('he-IL')}`}>
                      ☁️ {hoursAgo > 0 ? `${hoursAgo}ש` : `${minutesAgo}ד`}
                    </div>
                  )
                }
                return null
              })()}
            </div>
            
            <div className="flex gap-2">
              {/* כפתור סנכרון ידני */}
              <ManualSyncButton />
              
              {/* כפתורי ניהול נתונים */}
              <div className="relative group">
                <button className="bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm">
                  ⚙️ ניהול נתונים
                </button>
                
                {/* תפריט נפתח */}
                <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 w-48">
                  <button
                    onClick={exportData}
                    className="w-full text-right px-4 py-2 hover:bg-gray-100 transition-colors text-sm border-b border-gray-100"
                  >
                    📥 ייצא נתונים
                  </button>
                  
                  <button
                    onClick={saveToCloud}
                    className="w-full text-right px-4 py-2 hover:bg-green-100 text-green-700 transition-colors text-sm border-b border-gray-100"
                  >
                    ☁️ גיבוי חכם לענן
                  </button>
                  
                  <button
                    onClick={saveToGitHubGist}
                    className="w-full text-right px-4 py-2 hover:bg-purple-100 text-purple-700 transition-colors text-sm border-b border-gray-100"
                  >
                    🐙 שמור ב-GitHub
                  </button>
                  
                  <button
                    onClick={restoreFromBackup}
                    className="w-full text-right px-4 py-2 hover:bg-blue-100 text-blue-700 transition-colors text-sm border-b border-gray-100"
                  >
                    🔄 שחזר מגיבוי
                  </button>
                  
                  <label className="w-full text-right px-4 py-2 hover:bg-gray-100 transition-colors text-sm border-b border-gray-100 cursor-pointer block">
                    📤 ייבא נתונים
                    <input
                      type="file"
                      accept=".json"
                      onChange={importData}
                      className="hidden"
                    />
                  </label>
                  
                  <button
                    onClick={forceLoadSampleData}
                    className="w-full text-right px-4 py-2 hover:bg-blue-100 text-blue-600 transition-colors text-sm border-b border-gray-100"
                  >
                    📚 טען נתוני דוגמה
                  </button>
                  
                  <button
                    onClick={() => {
                      console.log('🔄 רענון סטטיסטיקות ידני')
                      updateTodayStats()
                    }}
                    className="w-full text-right px-4 py-2 hover:bg-blue-100 text-blue-600 transition-colors text-sm border-b border-gray-100"
                  >
                    🔄 רענן סטטיסטיקות
                  </button>
                  
                  <button
                    onClick={() => {
                      // יצירת סשן דוגמה לטסט
                      const testSession = {
                        id: Date.now().toString(),
                        courseId: 1,
                        lessonName: 'טסט',
                        topicTitle: 'טסט נושא',
                        startTime: new Date(),
                        endTime: new Date(),
                        duration: 1500, // 25 דקות
                        type: 'work',
                        completed: true
                      }
                      saveStudySession(testSession)
                      alert('נוסף סשן טסט!')
                    }}
                    className="w-full text-right px-4 py-2 hover:bg-green-100 text-green-600 transition-colors text-sm border-b border-gray-100"
                  >
                    🧪 הוסף סשן טסט
                  </button>
                  
                  <button
                    onClick={() => {
                      if (confirm('האם למחוק את כל הסטטיסטיקות?')) {
                        localStorage.removeItem(SESSIONS_KEY)
                        updateTodayStats()
                        alert('סטטיסטיקות נמחקו')
                      }
                    }}
                    className="w-full text-right px-4 py-2 hover:bg-orange-100 text-orange-600 transition-colors text-sm border-b border-gray-100"
                  >
                    🗑️ נקה סטטיסטיקות
                  </button>
                  
                  <button
                    onClick={resetData}
                    className="w-full text-right px-4 py-2 hover:bg-red-100 text-red-600 transition-colors text-sm"
                  >
                    🗑️ איפוס נתונים
                  </button>
                </div>
              </div>
              
              <button 
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                ➕ הוסף קורס
              </button>
            </div>
          </div>

          {/* Timer Widget פומודורו */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-3xl font-mono">
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </div>
                <div className="text-sm text-gray-600">
                  {timerState === 'working' ? '🎯 עבודה' : 
                   timerState === 'break' ? '☕ הפסקה' : '⏸️ מוכן'}
                </div>
              </div>
              
              <div className="flex space-x-2">
                {!isRunning ? (
                  <button 
                    onClick={() => startTimer()} 
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
                  >
                    ▶️ התחל
                  </button>
                ) : (
                  <button 
                    onClick={pauseTimer} 
                    className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 transition-colors"
                  >
                    ⏸️ עצור
                  </button>
                )}
                <button 
                  onClick={resetTimer} 
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
                >
                  🔄 איפוס
                </button>
                {timerState === 'working' && (
                  <button 
                    onClick={completeSession} 
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                  >
                    ✅ סיים
                  </button>
                )}
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-3 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-1000"
                style={{
                  width: `${((timerState === 'working' ? WORK_TIME : timerState === 'break' ? SHORT_BREAK : WORK_TIME) - timeLeft) / (timerState === 'working' ? WORK_TIME : timerState === 'break' ? SHORT_BREAK : WORK_TIME) * 100}%`
                }}
              />
            </div>
            
            {/* Session Info */}
            {currentSession.courseId && (
              <div className="mt-2 text-sm text-gray-600">
                🎓 לומד: {courses.find(c => c.id === currentSession.courseId)?.קורס} 
                {currentSession.lessonName && ` - ${currentSession.lessonName}`}
                {currentSession.topicTitle && ` - ${currentSession.topicTitle}`}
              </div>
            )}
            
            {/* Keyboard shortcut tip */}
            <div className="mt-2 text-xs text-gray-500">
              💡 טיפ: לחץ Ctrl + Space להתחלה/עצירה מהירה
            </div>
          </div>

          {/* Daily Stats Widget */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-green-800 mb-2">📊 סטטיסטיקות היום</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-lg font-bold text-green-700">
                  {Math.floor(todayStudyTime / 60)} דקות
                </div>
                <div className="text-green-600">⏱️ זמן לימוד</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-700">
                  {todayCompletedSessions}
                </div>
                <div className="text-green-600">🍅 פומודורו הושלמו</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-700">
                  {Math.round((todayStudyTime / (DAILY_GOAL_MINUTES * 60)) * 100)}%
                </div>
                <div className="text-green-600">🎯 יעילות יומית</div>
              </div>
            </div>
            
            {/* Daily Progress Bar */}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-green-600 mb-1">
                <span>התקדמות יומית</span>
                <span>יעד: {DAILY_GOAL_MINUTES} דקות</span>
              </div>
              <div className="bg-green-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (todayStudyTime / (DAILY_GOAL_MINUTES * 60)) * 100)}%`
                  }}
                />
              </div>
            </div>
            
            {/* Debug info - רק בפיתוח */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-2 text-xs text-blue-600 bg-blue-50 p-2 rounded">
                🔧 Debug: Sessions במחסן: {getSessionsHistory().length} | 
                היום: {getSessionsHistory().filter((s: any) => s.type === 'work' && s.completed && s.startTime && new Date(s.startTime).toDateString() === new Date().toDateString()).length} | 
                עדכון אחרון: {new Date().toLocaleTimeString()}
              </div>
            )}
          </div>

          {/* טופס הוספת קורס */}
          {showAddForm && (
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100 mb-6">
              <h2 className="text-xl font-semibold mb-4">הוסף קורס חדש</h2>
              <p className="text-sm text-gray-600 mb-3">פורמט JSON חדש עם שיעורים:</p>
              <textarea
                value={newCourseText}
                onChange={(e) => setNewCourseText(e.target.value)}
                placeholder={`{
  "קורס": "שם הקורס (למשל: כימיה פיזיקלית)",
  "שיעורים": [
    {
      "שם": "שם השיעור הראשון",
      "מצגת": "כותרת המצגת",
      "נושאים": [
        {
          "כותרת": "נושא ראשון",
          "מטרות": [
            "מטרה 1",
            "מטרה 2"
          ]
        }
      ]
    },
    {
      "שם": "שם השיעור השני",
      "מצגת": "כותרת המצגת",
      "נושאים": [...]
    }
  ]
}`}
                className="w-full h-64 p-3 border border-gray-300 rounded-lg font-mono text-sm mb-4"
              />
              <div className="flex gap-2">
                <button 
                  onClick={addNewCourse}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  ✅ הוסף קורס
                </button>
                <button 
                  onClick={() => setShowAddForm(false)}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  ❌ ביטול
                </button>
              </div>
            </div>
          )}

          {/* רשימת קורסים */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course: any) => {
              const progress = getCourseProgress(course)
              const totalLessons = course.שיעורים.length
              
              return (
                <div 
                  key={course.id}
                  className="bg-white rounded-lg shadow-md p-6 border border-gray-100 hover:shadow-lg transition-all border-r-4 border-blue-500 relative"
                >
                  {/* כפתורי עריכה ומחיקה */}
                  <div className="absolute top-2 left-2 flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        startEditCourse(course)
                      }}
                      className="bg-yellow-500 text-white p-1 rounded text-xs hover:bg-yellow-600 transition-colors"
                      title="ערוך קורס"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteCourse(course.id)
                      }}
                      className="bg-red-500 text-white p-1 rounded text-xs hover:bg-red-600 transition-colors"
                      title="מחק קורס"
                    >
                      🗑️
                    </button>
                  </div>

                  <div 
                    onClick={() => {
                      setCurrentCourse(course)
                      setCurrentView('lessons')
                    }}
                    className="cursor-pointer"
                  >
                    <h3 className="text-xl font-bold text-gray-800 mb-4 pr-12">📚 {course.קורס}</h3>
                    
                    <div className="mb-3">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>התקדמות כללית</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-blue-600 h-3 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      📖 {totalLessons} שיעורים
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {courses.length === 0 && (
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold text-gray-600 mb-4">אין קורסים עדיין</h3>
              <p className="text-gray-500 mb-6">התחל על ידי הוספת הקורס הראשון שלך</p>
              
              {/* כפתור חירום לטעינת נתוני דוגמה */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md mx-auto">
                <h4 className="text-lg font-semibold text-blue-800 mb-2">רוצה להתחיל עם דוגמאות?</h4>
                <p className="text-blue-600 text-sm mb-4">טען קורסי דוגמה (כימיה, פיזיקה, מבני נתונים)</p>
                <button
                  onClick={forceLoadSampleData}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  📚 טען נתוני דוגמה
                </button>
              </div>
            </div>
          )}

          {/* מודל עריכת קורס */}
          {editingCourse && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">ערוך קורס: {editingCourse.קורס}</h2>
                  <button 
                    onClick={() => {setEditingCourse(null); setEditCourseText('')}}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ❌
                  </button>
                </div>
                
                <textarea
                  value={editCourseText}
                  onChange={(e) => setEditCourseText(e.target.value)}
                  className="w-full h-96 p-3 border border-gray-300 rounded-lg font-mono text-sm mb-4"
                />
                
                <div className="flex gap-2">
                  <button 
                    onClick={saveEditCourse}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    ✅ שמור שינויים
                  </button>
                  <button 
                    onClick={() => {setEditingCourse(null); setEditCourseText('')}}
                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    ❌ ביטול
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
      </AuthWrapper>
    )
  }

  // 2️⃣ תצוגת שיעורים בקורס
  if (currentView === 'lessons') {
    return (
      <AuthWrapper>
        {showFirebaseFirstModal && (
          <FirebaseFirstNotification
            onConfirm={() => setShowFirebaseFirstModal(false)}
          />
        )}
        {renderSyncStatus()}
        <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setCurrentView('courses')
                  setCurrentCourse(null)
                }}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                ← חזרה לקורסים
              </button>
              <h1 className="text-3xl font-bold text-gray-800">📚 {currentCourse?.קורס}</h1>
            </div>
            <button 
              onClick={() => setShowAddLessonForm(!showAddLessonForm)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              ➕ הוסף שיעור
            </button>
          </div>

          {/* Timer Widget פומודורו */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-3xl font-mono">
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </div>
                <div className="text-sm text-gray-600">
                  {timerState === 'working' ? '🎯 עבודה' : 
                   timerState === 'break' ? '☕ הפסקה' : '⏸️ מוכן'}
                </div>
              </div>
              
              <div className="flex space-x-2">
                {!isRunning ? (
                  <button 
                    onClick={() => startTimer()} 
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
                  >
                    ▶️ התחל
                  </button>
                ) : (
                  <button 
                    onClick={pauseTimer} 
                    className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 transition-colors"
                  >
                    ⏸️ עצור
                  </button>
                )}
                <button 
                  onClick={resetTimer} 
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
                >
                  🔄 איפוס
                </button>
                {timerState === 'working' && (
                  <button 
                    onClick={completeSession} 
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                  >
                    ✅ סיים
                  </button>
                )}
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-3 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-1000"
                style={{
                  width: `${((timerState === 'working' ? WORK_TIME : timerState === 'break' ? SHORT_BREAK : WORK_TIME) - timeLeft) / (timerState === 'working' ? WORK_TIME : timerState === 'break' ? SHORT_BREAK : WORK_TIME) * 100}%`
                }}
              />
            </div>
            
            {/* Session Info */}
            {currentSession.courseId && (
              <div className="mt-2 text-sm text-gray-600">
                🎓 לומד: {courses.find(c => c.id === currentSession.courseId)?.קורס} 
                {currentSession.lessonName && ` - ${currentSession.lessonName}`}
                {currentSession.topicTitle && ` - ${currentSession.topicTitle}`}
              </div>
            )}
            
            {/* Keyboard shortcut tip */}
            <div className="mt-2 text-xs text-gray-500">
              💡 טיפ: לחץ Ctrl + Space להתחלה/עצירה מהירה
            </div>
          </div>

          {/* Daily Stats Widget */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-green-800 mb-2">📊 סטטיסטיקות היום</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-lg font-bold text-green-700">
                  {Math.floor(todayStudyTime / 60)} דקות
                </div>
                <div className="text-green-600">⏱️ זמן לימוד</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-700">
                  {todayCompletedSessions}
                </div>
                <div className="text-green-600">🍅 פומודורו הושלמו</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-700">
                  {Math.round((todayStudyTime / (DAILY_GOAL_MINUTES * 60)) * 100)}%
                </div>
                <div className="text-green-600">🎯 יעילות יומית</div>
              </div>
            </div>
          </div>

          {/* טופס הוספת שיעור */}
          {showAddLessonForm && (
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100 mb-6">
              <h2 className="text-xl font-semibold mb-4">הוסף שיעור חדש ל"{currentCourse?.קורס}"</h2>
              <p className="text-sm text-gray-600 mb-3">פורמט JSON לשיעור:</p>
              <textarea
                value={newLessonText}
                onChange={(e) => setNewLessonText(e.target.value)}
                placeholder={`{
  "שם": "שם השיעור החדש",
  "מצגת": "כותרת המצגת",
  "נושאים": [
    {
      "כותרת": "נושא ראשון",
      "מטרות": [
        "מטרה 1",
        "מטרה 2",
        "מטרה 3"
      ]
    },
    {
      "כותרת": "נושא שני", 
      "מטרות": [
        "מטרה 4",
        "מטרה 5"
      ]
    }
  ]
}`}
                className="w-full h-48 p-3 border border-gray-300 rounded-lg font-mono text-sm mb-4"
              />
              <div className="flex gap-2">
                <button 
                  onClick={addNewLesson}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  ✅ הוסף שיעור
                </button>
                <button 
                  onClick={() => setShowAddLessonForm(false)}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  ❌ ביטול
                </button>
              </div>
            </div>
          )}

          {/* רשימת שיעורים */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentCourse?.שיעורים.map((lesson: any, index: number) => {
              const progress = getLessonProgress(lesson)
              const totalTopics = lesson.נושאים.length
              
              return (
                <div 
                  key={index}
                  className="bg-white rounded-lg shadow-md p-6 border border-gray-100 hover:shadow-lg transition-all border-r-4 border-green-500 relative"
                >
                  {/* כפתורי עריכה ומחיקה */}
                  <div className="absolute top-2 left-2 flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        startEditLesson(lesson)
                      }}
                      className="bg-yellow-500 text-white p-1 rounded text-xs hover:bg-yellow-600 transition-colors"
                      title="ערוך שיעור"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteLesson(lesson.שם)
                      }}
                      className="bg-red-500 text-white p-1 rounded text-xs hover:bg-red-600 transition-colors"
                      title="מחק שיעור"
                    >
                      🗑️
                    </button>
                  </div>

                  <div 
                    onClick={() => {
                      setCurrentLesson(lesson)
                      setCurrentView('lesson-detail')
                    }}
                    className="cursor-pointer"
                  >
                    <h3 className="text-lg font-bold text-gray-800 mb-3 pr-12">📖 {lesson.שם}</h3>
                    <p className="text-sm text-gray-600 mb-4">{lesson.מצגת}</p>
                    
                    <div className="mb-3">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>התקדמות</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-green-600 h-3 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      📝 {totalTopics} נושאים
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* מודל עריכת שיעור */}
          {editingLesson && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">ערוך שיעור: {editingLesson.שם}</h2>
                  <button 
                    onClick={() => {setEditingLesson(null); setEditLessonText('')}}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ❌
                  </button>
                </div>
                
                <textarea
                  value={editLessonText}
                  onChange={(e) => setEditLessonText(e.target.value)}
                  className="w-full h-96 p-3 border border-gray-300 rounded-lg font-mono text-sm mb-4"
                />
                
                <div className="flex gap-2">
                  <button 
                    onClick={saveEditLesson}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    ✅ שמור שינויים
                  </button>
                  <button 
                    onClick={() => {setEditingLesson(null); setEditLessonText('')}}
                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    ❌ ביטול
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
      </AuthWrapper>
    )
  }

  // 3️⃣ תצוגת פרטי שיעור
  return (
    <AuthWrapper>
      {showFirebaseFirstModal && (
        <FirebaseFirstNotification
          onConfirm={() => setShowFirebaseFirstModal(false)}
        />
      )}
      {renderSyncStatus()}
      <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setCurrentView('lessons')}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            ← חזרה לשיעורים
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{currentLesson?.שם}</h1>
            <p className="text-gray-600">{currentLesson?.מצגת}</p>
          </div>
        </div>

        {/* Timer Widget פומודורו */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-3xl font-mono">
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </div>
              <div className="text-sm text-gray-600">
                {timerState === 'working' ? '🎯 עבודה' : 
                 timerState === 'break' ? '☕ הפסקה' : '⏸️ מוכן'}
              </div>
            </div>
            
            <div className="flex space-x-2">
              {!isRunning ? (
                <button 
                  onClick={() => startTimer(currentCourse?.id, currentLesson?.שם)} 
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
                >
                  ▶️ התחל
                </button>
              ) : (
                <button 
                  onClick={pauseTimer} 
                  className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 transition-colors"
                >
                  ⏸️ עצור
                </button>
              )}
              <button 
                onClick={resetTimer} 
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
              >
                🔄 איפוס
              </button>
              {timerState === 'working' && (
                <button 
                  onClick={completeSession} 
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                >
                  ✅ סיים
                </button>
              )}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-3 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-1000"
              style={{
                width: `${((timerState === 'working' ? WORK_TIME : timerState === 'break' ? SHORT_BREAK : WORK_TIME) - timeLeft) / (timerState === 'working' ? WORK_TIME : timerState === 'break' ? SHORT_BREAK : WORK_TIME) * 100}%`
              }}
            />
          </div>
          
          {/* Session Info */}
          {currentSession.courseId && (
            <div className="mt-2 text-sm text-gray-600">
              🎓 לומד: {courses.find(c => c.id === currentSession.courseId)?.קורס} 
              {currentSession.lessonName && ` - ${currentSession.lessonName}`}
              {currentSession.topicTitle && ` - ${currentSession.topicTitle}`}
            </div>
          )}
        </div>

        <div className="space-y-6">
          {currentLesson?.נושאים.map((topic: any, topicIndex: number) => (
            <div key={topicIndex} className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">📋 {topic.כותרת}</h3>
                <button 
                  onClick={() => startTimer(currentCourse?.id, currentLesson?.שם, topic.כותרת)}
                  className="text-xs bg-blue-100 hover:bg-blue-200 px-3 py-2 rounded-lg transition-colors flex items-center gap-1"
                  disabled={isRunning}
                  title={isRunning ? "טיימר כבר פועל" : "התחל פומודורו על הנושא הזה"}
                >
                  ⏱️ למד עכשיו
                </button>
              </div>
              
              <div className="space-y-2">
                {topic.מטרות.map((goal: any, goalIndex: number) => {
                  const normalizedGoal = normalizeGoal(goal)
                  const goalText = normalizedGoal.text
                  const goalNote = normalizedGoal.note
                  const isCompleted = topic.completedGoals?.includes(goalText)
                  const isEditingNote = editingGoalNote?.topicIndex === topicIndex && editingGoalNote?.goalText === goalText
                  
                  return (
                    <div 
                      key={goalIndex}
                      className={`p-3 rounded-lg transition-colors relative group ${
                        isCompleted ? 'bg-green-50 border border-green-200' : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      {/* שורה ראשית של המטרה */}
                      <div className="flex items-start gap-3">
                        <span 
                          className="text-lg cursor-pointer"
                          onClick={() => toggleGoal(topicIndex, goalText)}
                        >
                          {isCompleted ? '✅' : '⭕'}
                        </span>
                        <span 
                          className={`text-sm flex-1 cursor-pointer ${isCompleted ? 'text-green-800 line-through' : 'text-gray-700'}`}
                          onClick={() => toggleGoal(topicIndex, goalText)}
                        >
                          {goalText}
                        </span>
                        
                        {/* כפתורים */}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* כפתור הוספת/עריכת הערה */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (isEditingNote) {
                                setEditingGoalNote(null)
                                setTempNoteText('')
                              } else {
                                setEditingGoalNote({topicIndex, goalText})
                                setTempNoteText(goalNote)
                              }
                            }}
                            className="bg-blue-500 text-white text-xs px-2 py-1 rounded hover:bg-blue-600 transition-colors"
                            title={goalNote ? "ערוך הערה" : "הוסף הערה"}
                          >
                            📝
                          </button>
                          
                          {/* כפתור מחיקת מטרה */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (confirm('האם אתה בטוח שרוצה למחוק את המטרה הזו?')) {
                                const updatedTopics = [...currentLesson.נושאים]
                                updatedTopics[topicIndex].מטרות = updatedTopics[topicIndex].מטרות.filter((g: any) => {
                                  const normalizedG = normalizeGoal(g)
                                  return normalizedG.text !== goalText
                                })
                                updatedTopics[topicIndex].completedGoals = updatedTopics[topicIndex].completedGoals?.filter((g: string) => g !== goalText) || []
                                
                                const updatedLesson = { ...currentLesson, נושאים: updatedTopics }
                                setCurrentLesson(updatedLesson)
                                
                                const updatedCourses = courses.map(course => {
                                  if (course.id === currentCourse.id) {
                                    const updatedLessons = course.שיעורים.map((lesson: any) => 
                                      lesson.שם === currentLesson.שם ? updatedLesson : lesson
                                    )
                                    return { ...course, שיעורים: updatedLessons }
                                  }
                                  return course
                                })
                                saveCourses(updatedCourses)
                                setCurrentCourse(updatedCourses.find(c => c.id === currentCourse.id))
                              }
                            }}
                            className="bg-red-500 text-white text-xs px-2 py-1 rounded hover:bg-red-600 transition-colors"
                            title="מחק מטרה"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      
                      {/* תצוגת הערה קיימת */}
                      {goalNote && !isEditingNote && (
                        <div className="mt-2 mr-6 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                          💡 {goalNote}
                        </div>
                      )}
                      
                      {/* עריכת הערה */}
                      {isEditingNote && (
                        <div className="mt-2 mr-6">
                          <textarea
                            value={tempNoteText}
                            onChange={(e) => setTempNoteText(e.target.value)}
                            placeholder="הוסף הערה למטרה זו..."
                            className="w-full p-2 text-xs border border-gray-300 rounded resize-none"
                            rows={2}
                          />
                          <div className="flex gap-2 mt-1">
                            <button
                              onClick={() => {
                                updateGoalNote(topicIndex, goalText, tempNoteText)
                                setEditingGoalNote(null)
                                setTempNoteText('')
                              }}
                              className="bg-green-500 text-white text-xs px-2 py-1 rounded hover:bg-green-600"
                            >
                              ✅ שמור
                            </button>
                            <button
                              onClick={() => {
                                setEditingGoalNote(null)
                                setTempNoteText('')
                              }}
                              className="bg-gray-400 text-white text-xs px-2 py-1 rounded hover:bg-gray-500"
                            >
                              ❌ ביטול
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>
    </AuthWrapper>
  )
}

export default App