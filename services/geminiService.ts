
import { GoogleGenAI, Type } from "@google/genai";
import { AiEstimation } from "../types";

export const estimateMissionDetails = async (
  description: string,
  serviceType: string
): Promise<AiEstimation | null> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env?.API_KEY : undefined);
  if (!apiKey) {
    console.warn("Gemini API key not configured.");
    return null;
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: `Tu es un expert en services à domicile en Côte d'Ivoire (Ménage, Cuisine, Bricolage, etc.).
      Estime la durée et le prix pour le service "${serviceType}" avec cette description : "${description}".
      Utilise le contexte local ivoirien (FCFA). Propose une description professionnelle et structurée.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            estimatedDuration: {
              type: Type.NUMBER,
              description: "Durée estimée en heures"
            },
            suggestedPrice: {
              type: Type.NUMBER,
              description: "Prix suggéré en FCFA"
            },
            descriptionImprovement: {
              type: Type.STRING,
              description: "Reformulation professionnelle de la demande"
            },
          },
          required: ["estimatedDuration", "suggestedPrice", "descriptionImprovement"],
        },
      },
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as AiEstimation;
  } catch (error) {
    console.error("Gemini AI Estimation Error:", error);
    return null;
  }
};
