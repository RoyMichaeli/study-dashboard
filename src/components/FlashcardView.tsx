import { useState } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw, Eye, EyeOff } from 'lucide-react'
import type { StudyTopic } from '../store/useStore'

interface FlashcardViewProps {
  topics: StudyTopic[]
}

export const FlashcardView = ({ topics }: FlashcardViewProps) => {
  const [currentTopicIndex, setCurrentTopicIndex] = useState(0)
  const [currentGoalIndex, setCurrentGoalIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  
  const currentTopic = topics[currentTopicIndex]
  const currentGoal = currentTopic?.מטרות[currentGoalIndex]
  const totalCards = topics.reduce((sum, topic) => sum + topic.מטרות.length, 0)
  const currentCardNumber = topics.slice(0, currentTopicIndex).reduce((sum, topic) => sum + topic.מטרות.length, 0) + currentGoalIndex + 1
  
  const nextCard = () => {
    setShowAnswer(false)
    if (currentGoalIndex < currentTopic.מטרות.length - 1) {
      setCurrentGoalIndex(currentGoalIndex + 1)
    } else if (currentTopicIndex < topics.length - 1) {
      setCurrentTopicIndex(currentTopicIndex + 1)
      setCurrentGoalIndex(0)
    }
  }
  
  const prevCard = () => {
    setShowAnswer(false)
    if (currentGoalIndex > 0) {
      setCurrentGoalIndex(currentGoalIndex - 1)
    } else if (currentTopicIndex > 0) {
      setCurrentTopicIndex(currentTopicIndex - 1)
      setCurrentGoalIndex(topics[currentTopicIndex - 1].מטרות.length - 1)
    }
  }
  
  const resetCards = () => {
    setCurrentTopicIndex(0)
    setCurrentGoalIndex(0)
    setShowAnswer(false)
  }
  
  if (!currentTopic || !currentGoal) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">אין כרטיסי למידה זמינים</div>
      </div>
    )
  }
  
  const isCompleted = currentTopic.completedGoals?.includes(currentGoal)
  
  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>כרטיס {currentCardNumber} מתוך {totalCards}</span>
          <span>{Math.round((currentCardNumber / totalCards) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-primary-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentCardNumber / totalCards) * 100}%` }}
          />
        </div>
      </div>
      
      {/* Flashcard */}
      <div className="relative">
        <div 
          className={`card min-h-[300px] cursor-pointer transition-all duration-300 ${
            showAnswer ? 'bg-primary-50 border-primary-200' : 'bg-white'
          } ${isCompleted ? 'ring-2 ring-green-200' : ''}`}
          onClick={() => setShowAnswer(!showAnswer)}
        >
          {/* Topic Badge */}
          <div className="absolute top-4 right-4">
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
              {currentTopic.כותרת}
            </span>
            {isCompleted && (
              <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full mr-2">
                ✓ הושלם
              </span>
            )}
          </div>
          
          {/* Card Content */}
          <div className="pt-12 pb-6">
            {!showAnswer ? (
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">
                  מה אתה יודע על:
                </h3>
                <p className="text-lg text-gray-700 leading-relaxed">
                  {currentGoal}
                </p>
                <div className="mt-8 flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Eye className="w-4 h-4" />
                  לחץ לחשיפת התשובה
                </div>
              </div>
            ) : (
              <div className="text-center">
                <h3 className="text-xl font-semibold text-primary-800 mb-4">
                  תשובה מפורטת:
                </h3>
                <p className="text-lg text-gray-700 leading-relaxed mb-4">
                  {currentGoal}
                </p>
                {currentTopic.notes && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                    <h4 className="font-medium text-yellow-800 mb-2">הערות:</h4>
                    <p className="text-sm text-yellow-700">{currentTopic.notes}</p>
                  </div>
                )}
                <div className="mt-8 flex items-center justify-center gap-2 text-sm text-primary-600">
                  <EyeOff className="w-4 h-4" />
                  לחץ להסתרת התשובה
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Navigation Controls */}
      <div className="flex justify-between items-center mt-6">
        <button
          onClick={prevCard}
          disabled={currentTopicIndex === 0 && currentGoalIndex === 0}
          className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4" />
          הקודם
        </button>
        
        <button
          onClick={resetCards}
          className="btn-secondary flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          התחל מהתחלה
        </button>
        
        <button
          onClick={nextCard}
          disabled={currentTopicIndex === topics.length - 1 && currentGoalIndex === currentTopic.מטרות.length - 1}
          className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          הבא
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
      
      {/* Instructions */}
      <div className="mt-6 text-center text-sm text-gray-500">
        💡 טיפ: לחץ על הכרטיס כדי לחשוף/להסתיר את התשובה
      </div>
    </div>
  )
}