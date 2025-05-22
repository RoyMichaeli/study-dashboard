import { useState } from 'react'
import { X, Upload, FileText } from 'lucide-react'

interface AddCourseModalProps {
  isOpen: boolean
  onClose: () => void
  onAddCourse: (courseData: any) => void
}

export const AddCourseModal = ({ isOpen, onClose, onAddCourse }: AddCourseModalProps) => {
  const [jsonText, setJsonText] = useState('')
  const [error, setError] = useState('')
  const [examDate, setExamDate] = useState('')

  const handleSubmit = () => {
    try {
      const parsedData = JSON.parse(jsonText)
      
      // Validate JSON structure
      if (!parsedData.מצגת || !parsedData.נושאים) {
        setError('JSON חייב לכלול "מצגת" ו"נושאים"')
        return
      }
      
      const courseWithMetadata = {
        id: Date.now().toString(),
        ...parsedData,
        progress: 0,
        examDate: examDate || undefined,
        נושאים: parsedData.נושאים.map((topic: any) => ({
          ...topic,
          completedGoals: [],
          notes: ''
        }))
      }
      
      onAddCourse(courseWithMetadata)
      setJsonText('')
      setExamDate('')
      setError('')
      onClose()
    } catch (err) {
      setError('JSON לא תקין - בדוק את התחביר')
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        setJsonText(content)
      }
      reader.readAsText(file)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">הוסף קורס חדש</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium mb-2">העלה קובץ JSON</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex items-center justify-center gap-2 text-gray-600 hover:text-gray-800"
              >
                <Upload className="w-5 h-5" />
                בחר קובץ JSON
              </label>
            </div>
          </div>

          {/* Manual JSON Input */}
          <div>
            <label className="block text-sm font-medium mb-2">או הדבק JSON ידנית:</label>
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder={`{
  "מצגת": "שם הקורס",
  "נושאים": [
    {
      "כותרת": "שם הנושא",
      "מטרות": [
        "מטרה 1",
        "מטרה 2"
      ]
    }
  ]
}`}
              className="w-full h-64 p-3 border border-gray-300 rounded-lg font-mono text-sm"
            />
          </div>

          {/* Exam Date */}
          <div>
            <label className="block text-sm font-medium mb-2">תאריך מבחן (אופציונלי)</label>
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <button
              onClick={handleSubmit}
              disabled={!jsonText.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              הוסף קורס
            </button>
            <button
              onClick={onClose}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              ביטול
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}