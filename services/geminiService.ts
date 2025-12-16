import { GoogleGenAI, Type } from "@google/genai";
import { StockMetadata, PromptConfig, KeywordDensity } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to convert file to base64
const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const generateStockMetadata = async (file: File, config: PromptConfig): Promise<StockMetadata> => {
  try {
    const model = 'gemini-2.5-flash';
    const filePart = await fileToGenerativePart(file);

    const { systemInstruction } = buildInstructions(config);

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          filePart,
          { text: "Analyze this file and generate professional stock metadata and a generative AI prompt according to the configuration." }
        ]
      },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: getSchema(),
      },
    });

    if (response.text) {
      const metadata = JSON.parse(response.text) as StockMetadata;
      return { ...metadata, used_model: config.targetModel };
    } else {
      throw new Error("No response text received from Gemini.");
    }
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Gagal menganalisis file. Pastikan API Key valid dan file tidak rusak.");
  }
};

export const refineMetadata = async (
  currentData: StockMetadata, 
  instruction: string, 
  config: PromptConfig
): Promise<StockMetadata> => {
  try {
    const model = 'gemini-2.5-flash';
    
    const { modelInstruction } = getModelSpecificInstructions(config);
    const keywordInstruction = getKeywordDensityInstruction(config.keywordDensity);

    const systemInstruction = `
      You are an expert AI Artist and Stock Contributor. 
      Update the provided metadata based on the user's refinement instruction.
      
      CURRENT METADATA JSON:
      ${JSON.stringify(currentData)}
      
      REFINEMENT INSTRUCTION: "${instruction}"
      
      TARGET MODEL: ${config.targetModel}
      NEW ASPECT RATIO: ${config.aspectRatio}
      KEYWORD DENSITY SETTING: ${config.keywordDensity}
      
      MODEL RULES:
      ${modelInstruction}
      
      REQUIREMENTS:
      1. Update 'ai_prompt' to reflect the instruction and new aspect ratio.
      2. Update 'keywords' if the instruction adds/removes subjects or changes style.
      3. ${keywordInstruction.replace("4. keywords:", "Ensure keyword count matches preference:")}
      4. Keep other fields consistent unless the instruction implies changing them.
      5. Ensure output is valid JSON matching the schema.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          { text: "Refine the metadata based on the instructions." }
        ]
      },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: getSchema(),
      },
    });

    if (response.text) {
      const metadata = JSON.parse(response.text) as StockMetadata;
      return { ...metadata, used_model: config.targetModel };
    } else {
      throw new Error("No response text received from Gemini.");
    }

  } catch (error) {
    console.error("Gemini Refine Error:", error);
    throw new Error("Gagal melakukan refine prompt.");
  }
};

export const identifyPointInterest = async (file: File, x: number, y: number): Promise<string[]> => {
  try {
    const model = 'gemini-2.5-flash';
    const filePart = await fileToGenerativePart(file);

    // Prompt specifically for spatial understanding
    const prompt = `
      Look at the image. 
      Identify the specific object, texture, color, or detail located exactly at relative coordinates: X=${x}%, Y=${y}%.
      (X is horizontal from left 0 to 100, Y is vertical from top 0 to 100).
      
      Provide 3-5 specific, high-value stock photography keywords describing EXACTLY what is at that point.
      Return strictly a JSON object: { "keywords": ["keyword1", "keyword2", ...] }
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          filePart,
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            keywords: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });

    if (response.text) {
      const result = JSON.parse(response.text);
      return result.keywords || [];
    }
    return [];
  } catch (error) {
    console.error("Point Identification Error:", error);
    return [];
  }
};

export const generateImagePreview = async (prompt: string, aspectRatio: string): Promise<string | null> => {
  try {
    let safeRatio = "1:1";
    // Map non-standard ratios to nearest supported ones by Gemini 2.5 Flash Image
    switch (aspectRatio) {
        case "16:9": safeRatio = "16:9"; break;
        case "9:16": safeRatio = "9:16"; break;
        case "4:3": case "3:2": safeRatio = "4:3"; break;
        case "3:4": case "2:3": safeRatio = "3:4"; break;
        default: safeRatio = "1:1";
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: {
        // @ts-ignore: imageConfig is supported but might be missing in some type definitions
        imageConfig: { aspectRatio: safeRatio }
      }
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Preview generation failed", error);
    throw new Error("Gagal membuat preview image.");
  }
};

export const generateSeoVariations = async (currentData: StockMetadata): Promise<{
  descriptive: { title: string, description: string },
  conceptual: { title: string, description: string },
  commercial: { title: string, description: string }
}> => {
  try {
    const prompt = `
      Based on the following existing metadata, generate 3 DISTINCT variations of Title and Description for stock photography SEO.
      
      CURRENT DATA:
      Title: ${currentData.title}
      Description: ${currentData.description}
      Keywords: ${currentData.keywords.join(", ")}
      
      Provide 3 variations:
      1. Descriptive: Very literal, focuses on what is visibly present.
      2. Conceptual: Focuses on the mood, metaphor, or abstract concepts (e.g., "Freedom", "Innovation").
      3. Commercial: Catchy, punchy, designed for advertising/sales impact.
      
      Output strictly JSON.
    `;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            descriptive: {
              type: Type.OBJECT,
              properties: { title: { type: Type.STRING }, description: { type: Type.STRING } }
            },
            conceptual: {
               type: Type.OBJECT,
               properties: { title: { type: Type.STRING }, description: { type: Type.STRING } }
            },
            commercial: {
               type: Type.OBJECT,
               properties: { title: { type: Type.STRING }, description: { type: Type.STRING } }
            }
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    throw new Error("Failed to generate variations");

  } catch (error) {
    console.error("SEO Variations Error", error);
    throw error;
  }
};

// Helper functions to avoid code duplication
function getModelSpecificInstructions(config: PromptConfig) {
  let modelInstruction = "";
  if (config.targetModel === 'midjourney') {
    modelInstruction = `Format the 'ai_prompt' specifically for Midjourney v6. Use parameters like --ar ${config.aspectRatio} --v 6.0 at the end of the prompt. Use meaningful phrasing, avoiding filler words like "picture of".`;
  } else if (config.targetModel === 'stable_diffusion') {
    modelInstruction = `Format the 'ai_prompt' for Stable Diffusion XL. Use comma-separated tags and phrases. Emphasize key elements with (parentheses) if needed. Ensure the style is described first.`;
  } else if (config.targetModel === 'firefly') {
    modelInstruction = `Format the 'ai_prompt' for Adobe Firefly Image 3. Use natural language, descriptive sentences focusing on lighting, composition, and mood.`;
  } else if (config.targetModel === 'dalle') {
    modelInstruction = `Format the 'ai_prompt' for DALL-E 3. Use a detailed, descriptive paragraph that paints a full scene including specific details about the subject and environment.`;
  }
  return { modelInstruction };
}

function getKeywordDensityInstruction(density: KeywordDensity) {
  switch (density) {
    case 'low': return "4. keywords: A focused list of 15-20 highly relevant keywords/tags, ranked by relevance. Focus on the core subject only.";
    case 'high': return "4. keywords: An extensive list of 50 keywords/tags, ranked by relevance. Cover all aspects including synonyms, conceptual tags, emotions, and technical attributes.";
    case 'standard': default: return "4. keywords: A comprehensive list of 30-40 relevant keywords/tags, ranked by relevance.";
  }
}

function buildInstructions(config: PromptConfig) {
  const { modelInstruction } = getModelSpecificInstructions(config);
  const keywordInstruction = getKeywordDensityInstruction(config.keywordDensity);

  const techInstruction = config.includeTechnical 
    ? "Include specific camera settings (ISO, Aperture, Shutter Speed, Lens type) in the 'technical_settings' field and weave relevant technical terms (like 'depth of field', 'bokeh', '85mm') into the prompt where appropriate for photorealism."
    : "Keep the prompt focused on artistic style and subject matter. Only use technical terms if they define the art style (e.g. 'macro', 'wide angle').";

  const systemInstruction = `
    You are an expert Microstock Contributor and AI Artist (Midjourney/Stable Diffusion/Adobe Firefly expert). 
    Your task is to analyze the input image or PDF and generate metadata optimized for selling this asset on Adobe Stock, Shutterstock, and Getty Images.
    
    CRITICAL: All output fields MUST be in ENGLISH, as this is the standard language for global stock platforms.
    
    TARGET MODEL: ${config.targetModel}
    ASPECT RATIO: ${config.aspectRatio}
    
    INSTRUCTIONS:
    ${modelInstruction}
    ${techInstruction}
    
    Provide the following:
    1. title: A catchy, commercial title (5-10 words).
    2. description: A clear description for SEO (15-25 words).
    3. ai_prompt: The generative prompt based on the TARGET MODEL instructions above.
    ${keywordInstruction}
    5. category: The best category for this asset (e.g., Business, Lifestyle, Technology).
    6. technical_settings: Simulated camera settings or art style description.
  `;
  
  return { systemInstruction };
}

function getSchema() {
  return {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      description: { type: Type.STRING },
      ai_prompt: { type: Type.STRING },
      keywords: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING } 
      },
      category: { type: Type.STRING },
      technical_settings: { type: Type.STRING },
    },
    required: ["title", "description", "ai_prompt", "keywords", "category"],
  };
}