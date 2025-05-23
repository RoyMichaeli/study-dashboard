import { BookOpen, Calendar, Target, TrendingUp } from 'lucide-react'
import type { StudyCourse } from '../store/useStore'

interface CourseCardProps {
  course: StudyCourse
  onClick: () => void
}

export const CourseCard = ({ course, onClick }: CourseCardProps) => {
  const totalGoals = course.נושאים.reduce((sum, topic) => sum + topic.מטרות.length, 0)
  const completedGoals = course.נושאים.reduce((sum, topic) => sum + (topic.completedGoals?.length || 0), 0)
  
  return (
    <div 
      className="card hover:shadow-lg transition-all duration-300 cursor-pointer border-r-4 border-primary-500"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold text-gray-800">{course.מצגת}</h3>
        <BookOpen className="w-6 h-6 text-primary-600" />
      </div>
      
      <div className="space-y-3">
        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>התקדמות</span>
            <span>{course.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-l from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${course.progress}%` }}
            />
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-green-600" />
            <span>{completedGoals}/{totalGoals} מטרות</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span>{course.נושאים.length} נושאים</span>
          </div>
        </div>
        
        {/* Exam Date */}
        {course.examDate && (
          <div className="flex items-center gap-2 text-sm text-orange-600">
            <Calendar className="w-4 h-4" />
            <span>מבחן: {course.examDate}</span>
          </div>
        )}
      </div>
    </div>
  )
}