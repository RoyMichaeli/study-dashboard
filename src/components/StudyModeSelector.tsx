import { BookOpen, Brain, FileText, BarChart3 } from 'lucide-react'

interface StudyModeSelectorProps {
  currentMode: 'overview' | 'flashcards' | 'quiz' | 'notes'
  onModeChange: (mode: 'overview' | 'flashcards' | 'quiz' | 'notes') => void
}

export const StudyModeSelector = ({ currentMode, onModeChange }: StudyModeSelectorProps) => {
  const modes = [
    { id: 'overview' as const, label: 'סקירה כללית', icon: BarChart3, 
      activeClass: 'bg-blue-100 text-blue-700 border-2 border-blue-300' },
    { id: 'flashcards' as const, label: 'כרטיסי למידה', icon: Brain, 
      activeClass: 'bg-purple-100 text-purple-700 border-2 border-purple-300' },
    { id: 'quiz' as const, label: 'מבחן עצמי', icon: FileText, 
      activeClass: 'bg-green-100 text-green-700 border-2 border-green-300' },
    { id: 'notes' as const, label: 'הערות', icon: BookOpen, 
      activeClass: 'bg-orange-100 text-orange-700 border-2 border-orange-300' },
  ]
  
  return (
    <div className="flex gap-2 mb-6 overflow-x-auto">
      {modes.map((mode) => {
        const Icon = mode.icon
        const isActive = currentMode === mode.id
        
        return (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
              isActive 
                ? mode.activeClass
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Icon className="w-4 h-4" />
            {mode.label}
          </button>
        )
      })}
    </div>
  )
}