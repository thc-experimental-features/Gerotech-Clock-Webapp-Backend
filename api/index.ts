import 'dotenv/config';
import express, { json } from 'express';
import { Express, Request, Response } from 'express-serve-static-core';
import cors from 'cors';
import OpenAI from "openai";
import dotenv from "dotenv";
import { RequestBody } from './types';

dotenv.config();

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
    - Years Born: ${formData.yearsBorn}
    - Current Age: ${formData.age}
    - Country: ${formData.country}
    - Health Status: ${formData.healthStatus}
    - Current Diseases: ${formData.diseases}
    - Gender: ${formData.gender}
    - Living Arrangement: ${formData.livingArrangement}

    Provide general characteristics and experiences typical for this demographic group. Focus on:
    1. Common life experiences and historical events that shaped this generation in this ${formData.country}
    2. Experience with consumer technology for people aged ${formData.yearsBorn} years old in ${formData.country}
    3. Common burden of diseases based for ${formData.gender} and historical events of ${formData.country}
    4. General lifestyle patterns typical for people aged ${formData.yearsBorn} years old and cultural context of ${formData.country}
    5. Common health considerations for ${formData.yearsBorn} years old in ${formData.country} with the diseases ${formData.diseases}

    Do NOT create a specific fictional person or individual story. Instead, provide demographic insights and general characteristics.
    The birth year is ${formData.yearsBorn}. When listing historical events, calculate the person's age as (eventYear - ${formData.yearsBorn}).`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `You are an AI assistant that generates demographic health and events profiles. Based on the information about the person. Your responses should be in the following JSON format:
      {
        "persona": {
          "summary": "General demographic description of this population segment (at most 100 words)",
          "age": ${formData.age}
          "gender": ${formData.gender}
          "country": ${formData.country}
          "healthStatus": ${formData.healthStatus}
          "livingArrangement": ${formData.livingArrangement}
          (Note for the gender, country, healthStatus and livingArrangement, use the form data provided and don't make up any information, make the first letter of the gender, country, healthStatus and livingArrangement uppercase)
        },
        "historicalEvents": [Exactly 3 historical events for the ${formData.yearsBorn} years old in ${formData.country} with the following format:
          {
            "year": "YYYY",
            "ageAtEvent": "Age of the demographic group when the event occurred, calculated as (eventYear - ${formData.yearsBorn})",
            "event": "Significant historical event for this demographic",
            "description": "How this event typically affected this population segment"
          }
        ],
        "technology": {
            "familiarity": "Typical tech familiarity level for this demographic. This is a description of how familiar this demographic typically is with the following devices and should not be a category,
            it should be a concise description of how familiar this demographic typically is with the technology in general without mentioning the demographic group and only the familiarity (at most 15 words, minimum 10 words)",
            "devices": [
                {
                    "name": "Telephone",
                    "familiarity": "One of: 'Regular User', 'Basic User', 'Minimal User', 'Non User'",
                    "ageAtIntroduction": "Age when the device was first introduced to public (0 if it existed at birth)"
                },
                {
                    "name": "Television",
                    "familiarity": "One of: 'Regular User', 'Basic User', 'Minimal User', 'Non User'",
                    "ageAtIntroduction": "Age when the device was first introduced to public (0 if it existed at birth)"

                },
                {
                    "name": "Laptop",
                    "familiarity": "One of: 'Regular User', 'Basic User', 'Minimal User', 'Non User'",
                    "ageAtIntroduction": "Age when the device was first introduced to public (0 if it existed at birth)"
                },
                {
                    "name": "Smartphone",
                    "familiarity": "One of: 'Regular User', 'Basic User', 'Minimal User', 'Non User'",
                    "ageAtIntroduction": "Age when the device was first introduced to public (0 if it existed at birth)"
                },
                {
                    "name": "Tablet",
                    "familiarity": "One of: 'Regular User', 'Basic User', 'Minimal User', 'Non User'",
                    "ageAtIntroduction": "Age when the device was first introduced to public (0 if it existed at birth)"
                }
            ],
            "challenges": ["Common tech challenges for this demographic"]

        },
        "health": {
          "current": [List of diseases as stated in the form data ${formData.diseases} with the following format:
            {
              "name": "Formal medical name of the disease, presented in a user-friendly way",
              "commonChallenges": ["List of common challenges for ${formData.yearsBorn} years old in ${formData.country} with this specific disease"],
              "riskLevel": "Risk to physical and mental health of the disease for the ${formData.yearsBorn} years old in ${formData.country} must be one of: 'High Risk', 'Medium Risk', 'Low Risk' based on the demographic profile"
            }
          ],
          "conditions": ["Common health conditions from data about ${formData.yearsBorn} years olds in ${formData.country} with the diseases ${formData.diseases}"],
          "considerations": List of at most 3 typical health considerations and guidelines for ${formData.yearsBorn} years olds in ${formData.country} with the diseases the following diseases: ${formData.diseases}
        }
      }

      Important:
      - Do NOT create fictional individual stories
      - Focus on demographic trends and patterns
      - Provide general characteristics of the population segment
      - Base information on demographic data and research
      - Keep descriptions general and representative of the group
      - For each disease in the current array, provide realistic challenges and appropriate risk levels
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
