# Parts Catalog AI Extractor Documentation

## Overview

The **Parts Catalog AI Extractor** is an AI-powered tool designed to automatically extract structured data from technical parts manuals. It can process both images and PDF files of technical catalogs, read tables, diagrams, and part numbers, and extract this data into a standardized JSON format using Google's Gemini models.

The project contains two main parts:
1. **A Web Application (React/Vite)**: A user-friendly frontend allowing users to drag and drop catalog pages and visualize the extracted data in tabular or raw JSON formats.
2. **Batch Processing Scripts (Node.js)**: Scripts to process multiple PDFs locally and save the output as JSON files.

---

## 1. Web Application Architecture

The web application is built with React, Vite, Tailwind CSS, and uses Lucide for icons and Framer Motion for animations. 

### Key Components

- **`src/App.tsx`**: The main user interface. It provides a drag-and-drop zone using `react-dropzone` for uploading images (`.png`, `.jpg`, `.webp`) and `.pdf` files.
  - If a PDF is uploaded, it is first converted to images in the browser using `pdfjs-dist` (via `src/utils/pdfUtils.ts`).
  - The extracted data can be viewed in a "Table" format or "JSON" format, and can be easily copied or downloaded.
- **`src/services/catalogService.ts`**: The core logic connecting the frontend to AI models. 
  - Uses the `@google/genai` SDK to communicate with Gemini (specifically `gemini-3.1-flash-lite-preview`).
  - Optionally supports OpenRouter if configured via environment variables.
  - Passes the base64-encoded images to the AI along with a strict `SYSTEM_INSTRUCTION` ensuring the output adheres to a strict JSON schema.

### Data Schema
The AI is instructed to return a JSON object with the following structure:
- `catalog_id` (string)
- `categories` (array): Contains `name`, `page_number`, and `description`.
- `parts` (array): Contains `category_name`, `item_no`, `part_no`, `description`, and `qty`.

---

## 2. Batch Processing Scripts

Located in the `scripts/` directory, these scripts are useful for local, bulk processing of PDF files without needing the UI.

- **`scripts/extract_catalogs.ts`**: Iterates through a defined `INPUT_DIR` containing PDFs. It sends the PDFs directly to Gemini (`gemini-3-flash-preview`), parses the extracted JSON, and saves the output to an `extracted_json` directory.
- **`scripts/extract_failed.ts`**: Similar to the extraction script but designed to retry extraction for files that previously failed.

---

## 3. Environment Variables

To run the application or scripts, you need specific environment variables. Create a `.env` file in the root directory:

```env
# Required for Gemini API directly
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: To use OpenRouter instead of direct Gemini API
USE_OPENROUTER=true
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=google/gemini-2.0-flash-001:free
```

---

## 4. How to Run

### Web Application
1. Ensure dependencies are installed:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open the browser and navigate to the localhost URL provided.

### Scripts
To run the batch extraction scripts:
```bash
npm run extract
```
Or to re-run failed extractions:
```bash
npm run extract:failed
```
*(Note: You may need to edit the `INPUT_DIR` inside the script files to point to your local PDF directory.)*
