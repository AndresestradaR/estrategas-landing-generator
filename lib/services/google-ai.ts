import { GoogleGenAI, Modality } from '@anthropic-ai/google-genai'

/**
 * Build a base prompt for landing page image generation
 */
export function buildBasePrompt(productName: string, notes?: string): string {
  let prompt = `Professional e-commerce product landing page hero image for "${productName}". 
Clean white background, studio lighting, high-quality product photography style. 
Modern, minimalist aesthetic suitable for a premium dropshipping store. 
Sharp focus, professional composition, commercial quality.`

  if (notes) {
    prompt += `\n\nAdditional details: ${notes}`
  }

  return prompt
}

/**
 * Enhance prompt using Gemini
 */
export async function enhancePrompt(
  apiKey: string,
  productName: string,
  notes?: string
): Promise<string> {
  const genAI = new GoogleGenAI({ apiKey })
  
  const systemPrompt = `You are an expert at creating prompts for AI image generation, specifically for e-commerce product landing pages.
Your task is to transform simple product descriptions into detailed, professional prompts that will generate high-quality hero images for landing pages.

Focus on:
- Clean, professional aesthetic
- White or light gradient backgrounds
- Studio-quality lighting
- E-commerce/dropshipping visual style
- Modern, premium feel
- High contrast and sharp details

Always output ONLY the enhanced prompt, nothing else. No explanations, no quotes, just the prompt text.`

  const userMessage = `Create an optimized image generation prompt for a landing page hero image.

Product: ${productName}
${notes ? `Additional notes: ${notes}` : ''}

Generate a detailed prompt that will create a professional, conversion-optimized hero image.`

  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: userMessage,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
        maxOutputTokens: 500,
      },
    })

    const enhancedPrompt = response.text?.trim()
    
    if (!enhancedPrompt) {
      throw new Error('Empty response from Gemini')
    }

    return enhancedPrompt
  } catch (error) {
    console.error('Gemini enhancement failed:', error)
    // Return base prompt if enhancement fails
    return buildBasePrompt(productName, notes)
  }
}

/**
 * Generate image using Nano Banana Pro (Google's image model)
 */
export async function generateImage(
  apiKey: string,
  prompt: string
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  const genAI = new GoogleGenAI({ apiKey })

  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-3-pro-image-preview', // Nano Banana Pro
      contents: prompt,
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    })

    // Extract image from response
    const parts = response.candidates?.[0]?.content?.parts || []
    
    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        // Convert base64 to data URL
        const imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
        return { success: true, imageUrl }
      }
    }

    return { 
      success: false, 
      error: 'No image generated in response' 
    }
  } catch (error: any) {
    console.error('Image generation failed:', error)
    return { 
      success: false, 
      error: error.message || 'Error generating image' 
    }
  }
}
