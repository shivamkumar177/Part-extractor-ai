import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const useOpenRouter = process.env.USE_OPENROUTER === 'true';
const openRouterApiKey = process.env.OPENROUTER_API_KEY;
const openRouterModel = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001:free';

export interface CatalogPart {
  category_name: string;
  item_no: number;
  part_no: string;
  description: string;
  qty: number;
}

export interface CatalogCategory {
  name: string;
  page_number: number;
  description: string;
}

export interface CatalogData {
  catalog_id: string;
  categories: CatalogCategory[];
  parts: CatalogPart[];
}

export type ImageInput = { type: 'image'; data: string; mimeType: string };
export type PdfInput = { type: 'pdf'; images: { data: string; mimeType: string }[]; filename: string };
export type CatalogInput = ImageInput | PdfInput;

export interface CatalogCategory {
  name: string;
  page_number: number;
  description: string;
}

export interface CatalogData {
  catalog_id: string;
  categories: CatalogCategory[];
  parts: CatalogPart[];
}

const SYSTEM_INSTRUCTION = `You are an expert technical document extractor. Your task is to extract parts data, categories, and page numbers from technical catalog pages.

Output MUST be a single JSON object following this schema:
{
  "catalog_id": string (e.g., "h160-parts-manual"),
  "categories": [
    {
      "name": string,
      "page_number": number,
      "description": string
    }
  ],
  "parts": [
    {
      "category_name": string,
      "item_no": number,
      "part_no": string,
      "description": string,
      "qty": number
    }
  ]
}

Rules:
1. If a part number is missing, use an empty string.
2. If a quantity is missing, use 1.
3. The category_name in the parts list must match one of the names in the categories list.
4. If multiple pages are provided, combine them into one structured JSON.
5. Extract as much detail as possible from the tables and diagrams.`;

const JSON_SCHEMA = {
  type: "object",
  properties: {
    catalog_id: { type: "string" },
    categories: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          page_number: { type: "number" },
          description: { type: "string" }
        },
        required: ["name", "page_number", "description"]
      }
    },
    parts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category_name: { type: "string" },
          item_no: { type: "number" },
          part_no: { type: "string" },
          description: { type: "string" },
          qty: { type: "number" }
        },
        required: ["category_name", "item_no", "part_no", "description", "qty"]
      }
    }
  },
  required: ["catalog_id", "categories", "parts"]
};

async function extractWithOpenRouter(images: { data: string; mimeType: string }[]): Promise<CatalogData> {
  if (!openRouterApiKey) {
    throw new Error("OPENROUTER_API_KEY is required when USE_OPENROUTER is enabled.");
  }

  const base64Images = images.map(img => img.data.split(',')[1]);

  console.log('[CatalogService] Sending', images.length, 'image(s) to OpenRouter, model:', openRouterModel);

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openRouterApiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.APP_URL || 'https://localhost',
      'X-Title': 'Parts Catalog AI Extractor'
    },
    body: JSON.stringify({
      model: openRouterModel,
      messages: [
        {
          role: 'system',
          content: SYSTEM_INSTRUCTION
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract all parts and categories from these catalog pages. Output only valid JSON.' },
            ...base64Images.map((img, i) => ({
              type: 'image_url' as const,
              image_url: { url: `data:${images[i].mimeType};base64,${img}` }
            }))
          ]
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 16384
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[CatalogService] OpenRouter API error:', {
      status: response.status,
      statusText: response.statusText,
      error: error,
      model: openRouterModel,
      hasApiKey: !!openRouterApiKey
    });
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  console.log('[CatalogService] OpenRouter response received');

  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No data extracted from OpenRouter.");
  }

  return JSON.parse(content);
}

async function extractWithGemini(images: { data: string; mimeType: string }[]): Promise<CatalogData> {
  const model = "gemini-3.1-flash-lite-preview";

  const contents = images.map(img => ({
    inlineData: {
      data: img.data.split(',')[1],
      mimeType: img.mimeType
    }
  }));

  const response: GenerateContentResponse = await ai.models.generateContent({
    model,
    contents: [{ parts: [...contents, { text: "Extract all parts and categories from these catalog pages." }] }],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          catalog_id: { type: Type.STRING },
          categories: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                page_number: { type: Type.NUMBER },
                description: { type: Type.STRING }
              },
              required: ["name", "page_number", "description"]
            }
          },
          parts: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                category_name: { type: Type.STRING },
                item_no: { type: Type.NUMBER },
                part_no: { type: Type.STRING },
                description: { type: Type.STRING },
                qty: { type: Type.NUMBER }
              },
              required: ["category_name", "item_no", "part_no", "description", "qty"]
            }
          }
        },
        required: ["catalog_id", "categories", "parts"]
      }
    }
  });

  if (!response.text) {
    throw new Error("No data extracted from the catalog.");
  }

  return JSON.parse(response.text);
}

export async function extractCatalogData(inputs: CatalogInput[]): Promise<CatalogData> {
  console.log('[CatalogService] extractCatalogData called with', inputs.length, 'input(s)');
  console.log('[CatalogService] Using provider:', useOpenRouter ? 'OpenRouter' : 'Gemini');

  const allImages: { data: string; mimeType: string }[] = [];

  for (const input of inputs) {
    if (input.type === 'pdf') {
      console.log('[CatalogService] Processing PDF:', input.filename, 'with', input.images.length, 'pages');
      allImages.push(...input.images);
    } else {
      allImages.push({ data: input.data, mimeType: input.mimeType });
    }
  }

  console.log('[CatalogService] Total images to process:', allImages.length);

  if (useOpenRouter) {
    return extractWithOpenRouter(allImages);
  }
  return extractWithGemini(allImages);
}
