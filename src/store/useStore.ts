import { create } from 'zustand'

export interface StudyGoal {
  id: string
  text: string
  completed: boolean
  priority: 'low' | 'medium' | 'high'
}

export interface StudyTopic {
  כותרת: string
  מטרות: string[]
  completedGoals: string[]
  notes: string
}

export interface StudyCourse {
  id: string
  מצגת: string
  נושאים: StudyTopic[]
  progress: number
  examDate?: string
}

interface StudyStore {
  courses: StudyCourse[]
  currentCourse: StudyCourse | null
  studyMode: 'overview' | 'flashcards' | 'quiz' | 'notes'
  
  // Actions
  addCourse: (course: StudyCourse) => void
  setCurrentCourse: (course: StudyCourse) => void
  toggleGoalCompletion: (courseId: string, topicTitle: string, goalText: string) => void
  updateProgress: (courseId: string) => void
  addNote: (courseId: string, topicTitle: string, note: string) => void
  setStudyMode: (mode: 'overview' | 'flashcards' | 'quiz' | 'notes') => void
}

export const useStore = create<StudyStore>((set, get) => ({
  courses: [],
  currentCourse: null,
  studyMode: 'overview',
  
  addCourse: (course) => set((state) => ({
    courses: [...state.courses, course]
  })),
  
  setCurrentCourse: (course) => set({ currentCourse: course }),
  
  toggleGoalCompletion: (courseId, topicTitle, goalText) => set((state) => {
    const updatedCourses = state.courses.map(course => {
      if (course.id === courseId) {
        const updatedTopics = course.נושאים.map(topic => {
          if (topic.כותרת === topicTitle) {
            const isCompleted = topic.completedGoals?.includes(goalText)
            const completedGoals = isCompleted 
              ? topic.completedGoals?.filter(goal => goal !== goalText) || []
              : [...(topic.completedGoals || []), goalText]
            return { ...topic, completedGoals }
          }
          return topic
        })
        return { ...course, נושאים: updatedTopics }
      }
      return course
    })
    
    // Update progress
    const updatedCourse = updatedCourses.find(c => c.id === courseId)
    if (updatedCourse) {
      get().updateProgress(courseId)
    }
    
    return { courses: updatedCourses }
  }),
  
  updateProgress: (courseId) => set((state) => {
    const course = state.courses.find(c => c.id === courseId)
    if (!course) return state
    
    const totalGoals = course.נושאים.reduce((sum, topic) => sum + topic.מטרות.length, 0)
    const completedGoals = course.נושאים.reduce((sum, topic) => sum + (topic.completedGoals?.length || 0), 0)
    const progress = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0
    
    const updatedCourses = state.courses.map(c => 
      c.id === courseId ? { ...c, progress } : c
    )
    
    return { courses: updatedCourses }
  }),
  
  addNote: (courseId, topicTitle, note) => set((state) => {
    const updatedCourses = state.courses.map(course => {
      if (course.id === courseId) {
        const updatedTopics = course.נושאים.map(topic => {
          if (topic.כותרת === topicTitle) {
            return { ...topic, notes: note }
          }
          return topic
        })
        return { ...course, נושאים: updatedTopics }
      }
      return course
    })
    
    return { courses: updatedCourses }
  }),
  
  setStudyMode: (mode) => set({ studyMode: mode })
}))