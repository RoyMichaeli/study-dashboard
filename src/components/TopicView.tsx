import { CheckCircle, Circle, Edit3, Save, X } from 'lucide-react'
import { useState } from 'react'
import { StudyTopic } from '../store/useStore'

interface TopicViewProps {
  topic: StudyTopic
  courseId: string
  onToggleGoal: (goalText: string) => void
  onAddNote: (note: string) => void
}

export const TopicView = ({ topic, courseId, onToggleGoal, onAddNote }: TopicViewProps) => {
  const [isEditingNote, setIsEditingNote] = useState(false)
  const [noteText, setNoteText] = useState(topic.notes || '')
  
  const handleSaveNote = () => {
    onAddNote(noteText)
    setIsEditingNote(false)
  }
  
  const completedCount = topic.completedGoals?.length || 0
  const totalCount = topic.מטרות.length
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0
  
  return (
    <div className="card mb-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{topic.כותרת}</h3>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>{completedCount}/{totalCount}</span>
          <div className="w-16 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Goals List */}
      <div className="space-y-2 mb-4">
        {topic.מטרות.map((goal, index) => {
          const isCompleted = topic.completedGoals?.includes(goal)
          return (
            <div 
              key={index}
              className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                isCompleted ? 'bg-green-50 border border-green-200' : 'bg-gray-50 hover:bg-gray-100'
              }`}
              onClick={() => onToggleGoal(goal)}
            >
              {isCompleted ? (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              )}
              <span className={`text-sm ${isCompleted ? 'text-green-800 line-through' : 'text-gray-700'}`}>
                {goal}
              </span>
            </div>
          )
        })}
      </div>
      
      {/* Notes Section */}
      <div className="border-t pt-4">
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-medium text-gray-700">הערות אישיות</h4>
          {!isEditingNote && (
            <button
              onClick={() => setIsEditingNote(true)}
              className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
            >
              <Edit3 className="w-4 h-4" />
              עריכה
            </button>
          )}
        </div>
        
        {isEditingNote ? (
          <div className="space-y-2">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="הוסף הערות אישיות..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              rows={3}
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveNote}
                className="flex items-center gap-1 btn-primary text-sm"
              >
                <Save className="w-4 h-4" />
                שמור
              </button>
              <button
                onClick={() => {
                  setIsEditingNote(false)
                  setNoteText(topic.notes || '')
                }}
                className="flex items-center gap-1 btn-secondary text-sm"
              >
                <X className="w-4 h-4" />
                ביטול
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-600 min-h-[3rem] p-3 bg-gray-50 rounded-lg">
            {topic.notes || 'אין הערות עדיין...'}
          </div>
        )}
      </div>
    </div>
  )
}