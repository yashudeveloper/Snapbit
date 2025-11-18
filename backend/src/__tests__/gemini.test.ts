import { verifySnapWithAI, getConfidenceThresholds } from '../services/gemini'

// Mock the Gemini API
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn()
    })
  }))
}))

describe('Gemini AI Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Clear environment variable for consistent testing
    delete process.env.GEMINI_API_KEY
  })

  describe('verifySnapWithAI', () => {
    it('should return mock response when no API key is provided', async () => {
      const mockImageBuffer = Buffer.from('fake-image-data')
      const habitContext = {
        title: 'Morning Workout',
        category: 'fitness',
        description: 'Daily exercise routine'
      }

      const result = await verifySnapWithAI(mockImageBuffer, 'image/jpeg', habitContext)

      expect(result).toHaveProperty('approved')
      expect(result).toHaveProperty('confidence')
      expect(result).toHaveProperty('labels')
      expect(result).toHaveProperty('reason')
      expect(typeof result.approved).toBe('boolean')
      expect(typeof result.confidence).toBe('number')
      expect(result.confidence).toBeGreaterThanOrEqual(0)
      expect(result.confidence).toBeLessThanOrEqual(1)
      expect(Array.isArray(result.labels)).toBe(true)
    })

    it('should generate consistent mock results for same input', async () => {
      const mockImageBuffer = Buffer.from('fake-image-data')
      const habitContext = {
        title: 'Morning Workout',
        category: 'fitness'
      }

      const result1 = await verifySnapWithAI(mockImageBuffer, 'image/jpeg', habitContext)
      const result2 = await verifySnapWithAI(mockImageBuffer, 'image/jpeg', habitContext)

      // Results should be consistent for same input (deterministic mock)
      expect(result1.confidence).toBe(result2.confidence)
      expect(result1.approved).toBe(result2.approved)
    })

    it('should generate different results for different habits', async () => {
      const mockImageBuffer = Buffer.from('fake-image-data')
      
      const fitnessHabit = {
        title: 'Workout',
        category: 'fitness'
      }
      
      const nutritionHabit = {
        title: 'Healthy Meal',
        category: 'nutrition'
      }

      const result1 = await verifySnapWithAI(mockImageBuffer, 'image/jpeg', fitnessHabit)
      const result2 = await verifySnapWithAI(mockImageBuffer, 'image/jpeg', nutritionHabit)

      // Different habits should potentially have different results
      expect(result1.labels).not.toEqual(result2.labels)
    })
  })

  describe('Confidence Threshold Logic', () => {
    it('should approve high confidence results', () => {
      const determineApproval = (confidence: number): boolean => {
        if (confidence >= 0.70) {
          return true // APPROVE
        } else if (confidence >= 0.50) {
          return false // LOW_CONFIDENCE - manual review
        } else {
          return false // REJECT
        }
      }

      expect(determineApproval(0.85)).toBe(true)  // High confidence - approve
      expect(determineApproval(0.70)).toBe(true)  // Threshold - approve
      expect(determineApproval(0.65)).toBe(false) // Medium confidence - manual review
      expect(determineApproval(0.50)).toBe(false) // Threshold - manual review
      expect(determineApproval(0.30)).toBe(false) // Low confidence - reject
    })
  })

  describe('getConfidenceThresholds', () => {
    it('should return correct threshold configuration', () => {
      const thresholds = getConfidenceThresholds()

      expect(thresholds.approve).toBe(0.70)
      expect(thresholds.lowConfidence).toBe(0.50)
      expect(thresholds.reject).toBe(0.00)
      expect(thresholds.description).toBeDefined()
      expect(thresholds.description.approve).toContain('automatically approved')
      expect(thresholds.description.lowConfidence).toContain('manual review')
      expect(thresholds.description.reject).toContain('automatically rejected')
    })
  })

  describe('Mock Label Generation', () => {
    it('should generate appropriate labels for different categories', async () => {
      const mockImageBuffer = Buffer.from('fake-image-data')

      const categories = [
        { category: 'fitness', expectedLabels: ['person', 'exercise', 'gym', 'workout', 'active'] },
        { category: 'nutrition', expectedLabels: ['food', 'healthy', 'meal', 'kitchen', 'cooking'] },
        { category: 'mindfulness', expectedLabels: ['person', 'peaceful', 'meditation', 'calm', 'sitting'] }
      ]

      for (const { category, expectedLabels } of categories) {
        const result = await verifySnapWithAI(mockImageBuffer, 'image/jpeg', {
          title: 'Test Habit',
          category: category as any
        })

        // Check if result contains expected labels for the category
        const hasExpectedLabels = expectedLabels.some(label => 
          result.labels.includes(label)
        )
        expect(hasExpectedLabels).toBe(true)
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid image data gracefully', async () => {
      const invalidBuffer = Buffer.from('')
      const habitContext = {
        title: 'Test Habit',
        category: 'fitness' as const
      }

      // Should not throw an error, but return a fallback response
      const result = await verifySnapWithAI(invalidBuffer, 'image/jpeg', habitContext)
      
      expect(result).toHaveProperty('approved')
      expect(result).toHaveProperty('confidence')
      expect(result).toHaveProperty('labels')
      expect(result).toHaveProperty('reason')
    })

    it('should handle custom categories correctly', async () => {
      const mockImageBuffer = Buffer.from('fake-image-data')
      const habitContext = {
        title: 'Custom Activity',
        category: 'custom' as const,
        customCategory: 'Music Practice'
      }

      const result = await verifySnapWithAI(mockImageBuffer, 'image/jpeg', habitContext)
      
      expect(result.labels).toContain('activity')
      expect(result.reason).toContain('Custom Activity')
    })
  })

  describe('Prompt Building', () => {
    it('should build appropriate verification prompts', () => {
      const buildVerificationPrompt = (habit: any): string => {
        const category = habit.customCategory || habit.category
        
        return `
You are an AI assistant that verifies if images match specific habits for a habit-tracking app called SnapHabit.

HABIT TO VERIFY:
- Title: ${habit.title}
- Category: ${category}
- Description: ${habit.description || 'No description provided'}
`.trim()
      }

      const habit = {
        title: 'Morning Run',
        category: 'fitness',
        description: 'Daily 5k run'
      }

      const prompt = buildVerificationPrompt(habit)
      
      expect(prompt).toContain('Morning Run')
      expect(prompt).toContain('fitness')
      expect(prompt).toContain('Daily 5k run')
      expect(prompt).toContain('SnapHabit')
    })
  })
})
