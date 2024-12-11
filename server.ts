import 'dotenv/config';
import express, { json } from 'express';
import { Express, Request, Response } from 'express-serve-static-core';
import cors from 'cors';
import OpenAI from "openai";

// Define interfaces for type safety
interface FormData {
  ageRange: string;
  ageBand: string;
  country: string;
  healthStatus: string;
  gender?: string;
  livingArrangement?: string;
}

interface RequestBody {
  formData: FormData;
}

const app: Express = express();
app.use(cors());
app.use(express.json());

// Ensure OPENAI_API_KEY exists
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not defined in environment variables');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post('/api/openai', async (req: Request<{}, {}, RequestBody>, res: Response) => {
  try {
    const { formData } = req.body;

    if (!formData) {
      return res.status(400).json({ error: 'Form data is required' });
    }

    // Create a demographic-focused prompt
    const prompt = `Generate a demographic profile for the following elderly population segment:
    - Age Range: ${formData.ageRange}
    - Age Band: ${formData.ageBand}
    - Country: ${formData.country}
    - Health Status: ${formData.healthStatus}
    ${formData.gender ? `- Gender: ${formData.gender}` : ''}
    ${formData.livingArrangement ? `- Living Arrangement: ${formData.livingArrangement}` : ''}

    Provide general characteristics and experiences typical for this demographic group. Focus on:
    1. Common life experiences and historical events that shaped this generation in this region
    2. Typical technology usage patterns for this age group and location
    3. Common health considerations based on the demographic profile
    4. General lifestyle patterns typical for this age and cultural context

    Do NOT create a specific fictional person or individual story. Instead, provide demographic insights and general characteristics.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an AI assistant that generates demographic profiles for elderly populations. Based on the information about the person .Your responses should be in the following JSON format:
      {
        "persona": {
          "summary": "General demographic description of this population segment",
          "yearOfBirth": "Birth year range based on age"
        },
        "historicalEvents": [
          {
            "year": "YYYY",
            "event": "Significant historical event for this demographic",
            "description": "How this event typically affected this population segment"
          }
        ],
        "technology": {
          "familiarity": "Typical tech familiarity level for this demographic",
          "devices": ["Common devices used by this age group in this region"],
          "challenges": ["Common tech challenges for this demographic"]
        },
        "health": {
          "current": "Typical health status description for this demographic",
          "conditions": ["Common health conditions for this age group"],
          "predictions": ["Typical health considerations for this demographic"]
        }
      }

      Important:
      - Do NOT create fictional individual stories
      - Focus on demographic trends and patterns
      - Provide general characteristics of the population segment
      - Base information on demographic data and research
      - Keep descriptions general and representative of the group` 
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7, // Added for more consistent outputs
    });

    // Parse the response to ensure it's valid JSON
    const responseText = completion.choices[0].message.content;
    if (!responseText) {
      throw new Error('Empty response from AI');
    }

    try {
      const jsonResponse = JSON.parse(responseText);
      res.json(jsonResponse);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      res.status(500).json({ error: 'Invalid response format from AI' });
    }
  } catch (error) {
    console.error('Error generating demographic profile:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});