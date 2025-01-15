import 'dotenv/config';
import express, { json } from 'express';
import { Express, Request, Response } from 'express-serve-static-core';
import cors from 'cors';
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

interface FormData {
    ageRange: string;
    country: string;
    healthStatus: string;
    gender?: string;
    livingArrangement?: string;
}

interface RequestBody {
    formData: FormData;
}

// Rate limiting middleware
const { rateLimit } = require('express-rate-limit');
const limiter = rateLimit({
    windowMs: 1000,
    limit: 1,
    standardHeaders: true,
    legacyHeaders: false
});

const app: Express = express();
app.use(express.json());
app.use(cors());
app.options('*', cors());
app.use(limiter);

// Ensure OPENAI_API_KEY exists
if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not defined in environment variables');
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

app.get('/', (req, res) => {
    return res.json({
        message: 'API Works'
    })
})

app.post('/api/openai', async (req: Request<{}, {}, RequestBody>, res: Response) => {
    try {
        const { formData } = req.body;

        if (!formData) {
            return res.status(400).json({ error: 'Form data is required' });
        }

        // Create a demographic-focused prompt
        const prompt = `Generate a demographic profile for the following population segment:
    - Age Range: ${formData.ageRange}
    - Country: ${formData.country}
    - Health Status: ${formData.healthStatus}
    - Gender: ${formData.gender}
    - Living Arrangement: ${formData.livingArrangement}

    Provide general characteristics and experiences typical for this demographic group. Focus on:
    1. Common life experiences and historical events that shaped this generation in this ${formData.country}
    2. Experience with consumer technology for people aged ${formData.ageRange} years old in ${formData.country}
    3. Common health considerations based for ${formData.gender} and historical events of ${formData.country}
    4. General lifestyle patterns typical for people aged ${formData.ageRange} years old and cultural context of ${formData.country}

    Do NOT create a specific fictional person or individual story. Instead, provide demographic insights and general characteristics.`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `You are an AI assistant that generates demographic profiles. Based on the information about the person .Your responses should be in the following JSON format:
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
          "devices": ["Common devices used by ${formData.ageRange} years old in ${formData.country}"],
          "challenges": ["Common tech challenges for this demographic"]
        },
        "health": {
          "current": "Typical health status description for this demographic",
          "conditions": ["Common health conditions from data about ${formData.ageRange} years olds in ${formData.country}"],
          "predictions": ["Typical health considerations for ${formData.ageRange} years olds in ${formData.country}"]
        }
      }

      Important:
      - Do NOT create fictional individual stories
      - Focus on demographic trends and patterns
      - Provide general characteristics of the population segment
      - Base information on demographic data and research
      - Keep descriptions general and representative of the group
      - Respond in JSON format, following the structure above, don't add 3 backticks or ANY other formatting to the response. PROVIDE IN RAW JSON FORMAT.`
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
        console.log('AI response:', responseText);
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
