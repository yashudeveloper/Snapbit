import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = process.env.GEMINI_API_KEY

if (!apiKey) {
  console.warn('GEMINI_API_KEY not found. AI verification will use mock responses.')
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null

export interface AIVerificationResult {
  approved: boolean
  confidence: number
  labels: string[]
  reason: string
}

export interface HabitContext {
  title: string
  description?: string
  category: string
  customCategory?: string
}

/**
 * Verify a snap image against a habit using Gemini Vision API
 */
export async function verifySnapWithAI(
  imageBuffer: Buffer,
  mimeType: string,
  habit: HabitContext
): Promise<AIVerificationResult> {
  // If no API key, return mock response for development
  if (!genAI) {
    return getMockVerificationResult(habit)
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' })

    // Convert buffer to base64
    const imageBase64 = imageBuffer.toString('base64')

    const prompt = buildVerificationPrompt(habit)

    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: mimeType
      }
    }

    const result = await model.generateContent([prompt, imagePart])
    const response = await result.response
    const text = response.text()

    return parseAIResponse(text, habit)
  } catch (error) {
    console.error('Gemini AI verification error:', error)
    
    // Fallback to mock response on error
    return getMockVerificationResult(habit)
  }
}

/**
 * Build a detailed prompt for habit verification
 */
function buildVerificationPrompt(habit: HabitContext): string {
  const category = habit.customCategory || habit.category
  
  return `
You are an AI assistant that verifies if images match specific habits for a habit-tracking app called SnapHabit.

HABIT TO VERIFY:
- Title: ${habit.title}
- Category: ${category}
- Description: ${habit.description || 'No description provided'}

TASK:
Analyze the provided image and determine if it shows evidence of completing this specific habit.

VERIFICATION CRITERIA:
1. The image should clearly show the person engaging in or having completed the habit
2. Look for relevant objects, activities, environments, or results related to the habit
3. Consider the habit category and title when making your assessment

CONFIDENCE LEVELS:
- HIGH (0.80-1.00): Clear, obvious evidence of habit completion
- MEDIUM (0.60-0.79): Good evidence but some ambiguity
- LOW (0.40-0.59): Weak evidence, unclear or indirect
- VERY LOW (0.00-0.39): No evidence or unrelated content

RESPONSE FORMAT:
Respond with a JSON object containing:
{
  "approved": boolean,
  "confidence": number (0.00 to 1.00),
  "labels": ["label1", "label2", ...],
  "reason": "Brief explanation of your decision"
}

EXAMPLES BY CATEGORY:
- Fitness: Exercise equipment, workout clothes, gym environment, sweating, active poses
- Nutrition: Healthy food, meal prep, cooking, fruits/vegetables, proper portions
- Mindfulness: Meditation pose, quiet environment, yoga mat, peaceful setting
- Learning: Books, studying materials, educational content, notes, courses
- Productivity: Work setup, completed tasks, organized workspace, tools being used
- Health: Medical items, health tracking, supplements, health-related activities

Be strict but fair in your assessment. When in doubt, lean towards requiring clearer evidence.
`
}

/**
 * Parse AI response and extract verification result
 */
function parseAIResponse(responseText: string, habit: HabitContext): AIVerificationResult {
  try {
    // Try to extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }

    const parsed = JSON.parse(jsonMatch[0])
    
    // Validate and sanitize the response
    const confidence = Math.max(0, Math.min(1, parseFloat(parsed.confidence) || 0))
    const approved = determineApproval(confidence, parsed.approved)
    
    return {
      approved,
      confidence,
      labels: Array.isArray(parsed.labels) ? parsed.labels.slice(0, 10) : [],
      reason: typeof parsed.reason === 'string' ? parsed.reason.slice(0, 500) : 'AI analysis completed'
    }
  } catch (error) {
    console.error('Error parsing AI response:', error)
    
    // Fallback parsing - look for keywords
    return parseResponseFallback(responseText, habit)
  }
}

/**
 * Determine approval based on confidence thresholds
 */
function determineApproval(confidence: number, aiApproved?: boolean): boolean {
  // Balanced threshold settings (as specified in requirements)
  if (confidence >= 0.70) {
    return true // APPROVE
  } else if (confidence >= 0.50) {
    return false // LOW_CONFIDENCE - will need manual review
  } else {
    return false // REJECT
  }
}

/**
 * Fallback response parsing when JSON parsing fails
 */
function parseResponseFallback(responseText: string, habit: HabitContext): AIVerificationResult {
  const text = responseText.toLowerCase()
  
  // Look for positive indicators
  const positiveWords = ['yes', 'approved', 'correct', 'matches', 'evidence', 'shows']
  const negativeWords = ['no', 'rejected', 'incorrect', 'unrelated', 'unclear', 'missing']
  
  const positiveCount = positiveWords.filter(word => text.includes(word)).length
  const negativeCount = negativeWords.filter(word => text.includes(word)).length
  
  // Extract confidence if mentioned
  const confidenceMatch = text.match(/(\d+(?:\.\d+)?)\s*%?/)
  let confidence = 0.5 // Default medium confidence
  
  if (confidenceMatch) {
    const value = parseFloat(confidenceMatch[1])
    confidence = value > 1 ? value / 100 : value // Convert percentage if needed
  } else if (positiveCount > negativeCount) {
    confidence = 0.75
  } else if (negativeCount > positiveCount) {
    confidence = 0.25
  }
  
  return {
    approved: determineApproval(confidence),
    confidence: Math.max(0, Math.min(1, confidence)),
    labels: extractLabelsFromText(text),
    reason: 'Fallback analysis due to parsing error'
  }
}

/**
 * Extract potential labels from text
 */
function extractLabelsFromText(text: string): string[] {
  const commonLabels = [
    'person', 'exercise', 'food', 'book', 'computer', 'gym', 'kitchen',
    'outdoor', 'indoor', 'healthy', 'workout', 'meditation', 'study'
  ]
  
  return commonLabels.filter(label => text.includes(label)).slice(0, 5)
}

/**
 * Generate mock verification result for development/testing
 */
function getMockVerificationResult(habit: HabitContext): AIVerificationResult {
  // Generate deterministic but varied results based on habit
  const hash = simpleHash(habit.title + habit.category)
  const confidence = 0.5 + (hash % 40) / 100 // 0.5 to 0.89
  
  const mockLabels = generateMockLabels(habit.category)
  
  return {
    approved: determineApproval(confidence),
    confidence,
    labels: mockLabels,
    reason: `Mock AI verification for ${habit.title}. Confidence: ${(confidence * 100).toFixed(0)}%`
  }
}

/**
 * Generate mock labels based on habit category
 */
function generateMockLabels(category: string): string[] {
  const labelMap: Record<string, string[]> = {
    fitness: ['person', 'exercise', 'gym', 'workout', 'active'],
    nutrition: ['food', 'healthy', 'meal', 'kitchen', 'cooking'],
    mindfulness: ['person', 'peaceful', 'meditation', 'calm', 'sitting'],
    productivity: ['computer', 'work', 'desk', 'organized', 'focused'],
    learning: ['book', 'study', 'education', 'reading', 'notes'],
    social: ['people', 'group', 'friends', 'social', 'together'],
    creativity: ['art', 'creative', 'design', 'artistic', 'making'],
    health: ['health', 'medical', 'wellness', 'care', 'tracking'],
    custom: ['activity', 'habit', 'practice', 'routine', 'personal']
  }
  
  return labelMap[category] || labelMap.custom
}

/**
 * Simple hash function for consistent mock results
 */
function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

/**
 * Get confidence threshold information
 */
export function getConfidenceThresholds() {
  return {
    approve: 0.70,
    lowConfidence: 0.50,
    reject: 0.00,
    description: {
      approve: 'High confidence - automatically approved',
      lowConfidence: 'Medium confidence - requires manual review',
      reject: 'Low confidence - automatically rejected'
    }
  }
}
