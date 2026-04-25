import fs from 'fs';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import 'dotenv/config';

const MODEL = 'google/gemma-4-31b-it';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const INPUT_DIR = '/Users/shivamkumar/Developer/shopCatalog/backend/split_catalogs/H380';
const OUTPUT_DIR = path.join(INPUT_DIR, 'extracted_json');

const FILES_TO_PROCESS = [
  'h380-wheel-loader_CYLINDER_HEAD_&_BONNET.pdf',
  'h380-wheel-loader_Closed_hydrostatic_transmission_and_control_system.pdf',
  'h380-wheel-loader_Counterweight_and_traction.pdf',
  'h380-wheel-loader_EXHAUST_MANIFOLD.pdf',
  'h380-wheel-loader_FUEL_INJECTION_PUMP.pdf',
  'h380-wheel-loader_FUEL_INJECTION_VALVE.pdf',
  'h380-wheel-loader_INLET_MANIFOLD.pdf',
  'h380-wheel-loader_LUB.OIL_SYSTEM.pdf',
  'h380-wheel-loader_Rear_drive_axle.pdf',
  'h380-wheel-loader_Steering_column_cover.pdf',
];

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY || '' });

interface CatalogPart {
  category_name: string;
  item_no: number;
  part_no: string;
  description: string;
  qty: number;
}

interface CatalogCategory {
  name: string;
  page_number: number;
  description: string;
}

interface CatalogData {
  catalog_id: string;
  categories: CatalogCategory[];
  parts: CatalogPart[];
}

const SYSTEM_INSTRUCTION = `You are an expert technical document extractor. Your task is to extract parts data, categories, and page numbers from technical catalog pages.

Output MUST be a single JSON object following this schema:
{
  "catalog_id": string (e.g., "h380-parts-manual"),
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
4. Extract all parts and categories from the pages.
5. Extract as much detail as possible from tables and diagrams.`;

async function extractWithGemini(images: { data: string; mimeType: string }[]): Promise<CatalogData> {
  const model = MODEL;
  
  const contents = images.map(img => ({
    inlineData: {
      data: img.data.split(',')[1],
      mimeType: img.mimeType
    }
  }));

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [...contents, { text: 'Extract all parts and categories from this catalog PDF. Output only valid JSON matching the schema.' }] }],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
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
              required: ['name', 'page_number', 'description']
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
              required: ['category_name', 'item_no', 'part_no', 'description', 'qty']
            }
          }
        },
        required: ['catalog_id', 'categories', 'parts']
      }
    }
  });

  if (!response.text) {
    throw new Error('No data extracted from the catalog.');
  }

  return JSON.parse(response.text);
}

async function processPdf(pdfPath: string, outputPath: string): Promise<void> {
  const filename = path.basename(pdfPath);
  console.log(`[${new Date().toISOString()}] Processing: ${filename}`);
  
  console.log(`  Note: Sending PDF directly to Gemini for processing`);
  
  const pdfBuffer = fs.readFileSync(pdfPath);
  const base64Pdf = pdfBuffer.toString('base64');
  const dataUrl = `data:application/pdf;base64,${base64Pdf}`;
  
  const contents = [{
    inlineData: {
      data: base64Pdf,
      mimeType: 'application/pdf'
    }
  }];

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ parts: [...contents, { text: 'Extract all parts and categories from this catalog PDF. Output only valid JSON matching the schema.' }] }],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
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
              required: ['name', 'page_number', 'description']
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
              required: ['category_name', 'item_no', 'part_no', 'description', 'qty']
            }
          }
        },
        required: ['catalog_id', 'categories', 'parts']
      }
    }
  });

  if (!response.text) {
    throw new Error('No data extracted from the catalog.');
  }

  const data = JSON.parse(response.text);
  console.log(`  Extracted ${data.parts?.length || 0} parts, ${data.categories?.length || 0} categories`);
  
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`  Saved: ${path.basename(outputPath)}`);
}

async function main() {
  if (!GEMINI_API_KEY) {
    console.error('ERROR: GEMINI_API_KEY not set in environment');
    process.exit(1);
  }
  
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created output directory: ${OUTPUT_DIR}`);
  }
  
  console.log(`Processing ${FILES_TO_PROCESS.length} files with model: ${MODEL}`);
  
  let processed = 0;
  let failed = 0;
  
  for (const file of FILES_TO_PROCESS) {
    const pdfPath = path.join(INPUT_DIR, file);
    const jsonFilename = file.replace(/\.pdf$/i, '.json');
    const outputPath = path.join(OUTPUT_DIR, jsonFilename);
    
    if (!fs.existsSync(pdfPath)) {
      console.log(`[NOT FOUND] ${file}`);
      continue;
    }

    const existingOutput = path.join(OUTPUT_DIR, jsonFilename);
    if (fs.existsSync(existingOutput)) {
      fs.unlinkSync(existingOutput);
      console.log(`[REMOVING old] ${jsonFilename} to re-extract`);
    }
    
    let success = false;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (!success && attempts < maxAttempts) {
      attempts++;
      try {
        await processPdf(pdfPath, outputPath);
        success = true;
        processed++;
      } catch (err) {
        console.error(`  Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        if (attempts < maxAttempts) {
          console.log(`  Retrying in 5 seconds... (attempt ${attempts + 1}/${maxAttempts})`);
          await new Promise(r => setTimeout(r, 5000));
        } else {
          console.error(`  FAILED after ${maxAttempts} attempts: ${file}`);
          failed++;
        }
      }
    }
    
    if (success) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`Processed: ${processed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Output: ${OUTPUT_DIR}`);
}

main();