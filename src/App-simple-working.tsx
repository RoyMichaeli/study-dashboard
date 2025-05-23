import { useState } from 'react'
import './index.css'

// נתוני דוגמה פשוטים
const initialCourses = [
  {
    id: 1,
    name: "כימיה אורגנית 1",
    lessons: [
      {
        title: "אלקאנים א'",
        topics: ["מושגי יסוד", "נוסחאות", "מבנה מולקולרי"],
        completed: [false, false, false]
      }
    ]
  },
  {
    id: 2,
    name: "פיזיקה",
    lessons: [
      {
        title: "מכניקה",
        topics: ["כוחות", "תנועה", "אנרגיה"],
        completed: [false, false, false]
      }
    ]
  }
]

function App() {
  const [courses] = useState(initialCourses)
  const [selectedCourse, setSelectedCourse] = useState<any>(null)

  console.log('App rendering, courses:', courses) // דיבוג

  if (selectedCourse) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => setSelectedCourse(null)}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg mb-6"
          >
            ← חזרה
          </button>
          
          <h1 className="text-2xl font-bold mb-6">{selectedCourse.name}</h1>
          
          {selectedCourse.lessons.map((lesson: any, index: number) => (
            <div key={index} className="bg-white rounded-lg p-6 shadow-md mb-4">
              <h3 className="text-lg font-semibold mb-4">{lesson.title}</h3>
              {lesson.topics.map((topic: string, topicIndex: number) => (
                <div key={topicIndex} className="flex items-center gap-3 p-2">
                  <span>{lesson.completed[topicIndex] ? '✅' : '⭕'}</span>
                  <span>{topic}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">🎓 דשבורד לימודים</h1>
        
        {courses.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-xl text-gray-600">אין קורסים</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div 
                key={course.id}
                onClick={() => setSelectedCourse(course)}
                className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-all"
              >
                <h3 className="text-xl font-bold text-gray-800 mb-4">📚 {course.name}</h3>
                <div className="text-sm text-gray-600">
                  📖 {course.lessons.length} שיעורים
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default App