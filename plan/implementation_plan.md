# Add OpenRouter Integration

Add an option to use OpenRouter as an alternative AI provider, toggled via an environment flag.

## User Review Required

> [!IMPORTANT]
> To use OpenRouter, you will need to add `OPENROUTER_API_KEY` to your `.env.local` file and set `USE_OPENROUTER=true`.

## Proposed Changes

### Configuration

#### [MODIFY] [vite.config.ts](file:///Users/shivamkumar/Developer/magnus_downloads/Parts%20Catalog%20AI%20Extractor/vite.config.ts)
- Add injection for `USE_OPENROUTER`, `OPENROUTER_API_KEY`, and `OPENROUTER_MODEL` to the client-side code via the `define` property.

#### [MODIFY] [.env.example](file:///Users/shivamkumar/Developer/magnus_downloads/Parts%20Catalog%20AI%20Extractor/.env.example)
- Add the new environment variables for OpenRouter:
  - `USE_OPENROUTER` (boolean)
  - `OPENROUTER_API_KEY` (string)
  - `OPENROUTER_MODEL` (string)

### AI Service

#### [MODIFY] [catalogService.ts](file:///Users/shivamkumar/Developer/magnus_downloads/Parts%20Catalog%20AI%20Extractor/src/services/catalogService.ts)
- Refactor `extractCatalogData` to check `process.env.USE_OPENROUTER`.
- Implement `extractWithOpenRouter` using the standard `fetch` API.
- Update the payload structure to match OpenRouter's OpenAI-compatible schema, including support for image extraction.
- Create a unified `CatalogData` output regardless of the provider used.

## Open Questions

- **Model Choice**: Do you have a preferred default model for OpenRouter? (e.g., `google/gemini-2.0-flash-001` or `anthropic/claude-3.5-sonnet`). I will default to `google/gemini-2.0-flash-001` if not specified.
- **Strict Mode**: Should I use OpenRouter's "Strict Mode" for JSON schemas? It ensures perfect adherence but might not be supported by all models. I'll start with `json_object` and a strong prompt for maximum compatibility.

## Verification Plan

### Automated Tests
- Build verification to ensure Vite correctly injects the new environment variables.

### Manual Verification
- Testing by toggling `USE_OPENROUTER=true` in `.env.local` and verifying the API calls go to OpenRouter.
