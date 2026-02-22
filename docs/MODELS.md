# AI Models

## Configuration Files

| File | Purpose | Size |
|------|---------|------|
| `lib/models-config.ts` | Full model catalog (all parameters, settings, provider paths) | 187KB |
| `lib/models-lite.ts` | Lightweight model list for client-side selectors | 19KB |
| `lib/models-limits.ts` | Rate limits and concurrent job limits per model | 9KB |
| `lib/pricing.ts` | Cost calculations (credits, USD) | — |
| `lib/lora-trainers-config.ts` | LoRA training configurations | — |
| `lib/presets-config.ts` | Pre-configured model parameter presets | 14KB |

## Action Types

Defined in `lib/models-lite.ts`:

| Action | Category | Description |
|--------|----------|------------|
| `create` | Image | Generate image from text |
| `edit` | Image | Edit existing image |
| `upscale` | Image | Increase resolution |
| `remove_bg` | Image | Remove background |
| `inpaint` | Image | Fill masked area |
| `expand` | Image | Outpainting / extend borders |
| `video_create` | Video | Text-to-video |
| `video_i2v` | Video | Image-to-video |
| `video_edit` | Video | Edit existing video |
| `video_upscale` | Video | Upscale video resolution |
| `analyze_describe` | Analyze | Describe image content |
| `analyze_ocr` | Analyze | Extract text from image |
| `analyze_prompt` | Analyze | Generate prompt from image |

## Image Models

### Create (18+ models)

| ID | Display Name | Provider | Key Feature |
|----|-------------|----------|-------------|
| `flux-dev-lora` | Flux LoRA | Replicate | Custom LoRA styles |
| `flux-2-max` | FLUX 2 Max | Replicate | Top quality, up to 8 references |
| `flux-2-pro` | FLUX 2 Pro | Replicate | Generation + editing with references |
| `seedream-4` | SeeDream 4 | Replicate | ByteDance, up to 4K |
| `seedream-4.5` | SeeDream 4.5 | Replicate | Improved spatial understanding |
| `nano-banana-pro` | Nano Banana Pro | Google | Text rendering, up to 14 references |
| `nano-banana` | Nano Banana | Google | Gemini 2.5, fast, 3 references |
| `ideogram-v3-turbo` | Ideogram V3 Turbo | Replicate | Style support + inpainting |
| `flux-1.1-pro` | FLUX 1.1 Pro | Replicate | Fast, good quality |
| `imagen-4-ultra` | Imagen 4 Ultra | Google | Maximum quality |
| `flux-kontext-max` | FLUX Kontext Max | Replicate | Premium editing + text |
| `recraft-v3-svg` | Recraft V3 SVG | Replicate | SVG generation |
| `recraft-v3` | Recraft V3 | Replicate | Style control |
| `sd-3.5-large` | SD 3.5 Large | Replicate | img2img support |
| `minimax-image-01` | MiniMax Image-01 | Replicate | Cheap, face reference |
| `z-image-turbo` | Z-Image Turbo | Replicate | Ultra-fast (8 steps), text rendering |
| `higgsfield-soul-*` | Higgsfield Soul | Higgsfield | Admin-only |

### Edit (10+ models)

| ID | Display Name | Key Feature |
|----|-------------|-------------|
| `nano-banana-pro-edit` | Nano Banana Pro | Text on images |
| `flux-kontext-max-edit` | FLUX Kontext Max | Premium editing with text |
| `seedream-4-edit` | SeeDream 4 | Precise editing up to 4K |
| `bria-eraser` | Bria Eraser | Object removal |
| `bria-genfill` | Bria GenFill | Add objects / transform |
| `flux-kontext-fast` | FLUX Kontext Fast | Ultra-fast editing |
| `flux-fill-pro` | FLUX Fill Pro | Zoom Out / Outpainting |
| `luma-reframe-image` | Luma Reframe | AI-based aspect ratio change |
| `reve-edit` | Reve Edit | General editing |

### Expand (2 models)

| ID | Display Name | Key Feature |
|----|-------------|-------------|
| `bria-expand` | Bria Expand | Fixed aspect ratios |
| `outpainter` | Outpainter | Per-direction expansion |

### Upscale (6 models)

| ID | Display Name | Key Feature |
|----|-------------|-------------|
| `google-upscaler` | Google Upscaler | 2x or 4x |
| `recraft-crisp-upscale` | Recraft Crisp | Sharp for web/print |
| `crystal-upscaler` | Crystal Upscaler | Portraits and products |
| `real-esrgan` | Real-ESRGAN | Universal, face enhancement |
| `magic-image-refiner` | Magic Image Refiner | Quality + inpainting |
| `clarity-upscaler` | Clarity Upscaler | Fine control (creativity/resemblance) |

### Remove Background (4 models)

| ID | Display Name | Key Feature |
|----|-------------|-------------|
| `851-background-remover` | Background Remover | Fast, with options |
| `lucataco-remove-bg` | Remove BG | Simple |
| `bria-remove-background` | Bria Remove BG | Professional, e-commerce |
| `birefnet` | BiRefNet | Best edge quality |

### Inpaint (3 models)

| ID | Display Name | Key Feature |
|----|-------------|-------------|
| `bria-genfill-inpaint` | Bria GenFill | Add objects via mask |
| `flux-fill-pro` | FLUX Fill Pro | Best quality inpainting |
| `bria-eraser-inpaint` | Bria Eraser | Object removal via mask |

## Video Models

### Text-to-Video (10 models)

| ID | Display Name | Provider | Key Feature |
|----|-------------|----------|-------------|
| `veo-3.1-fast` | Veo 3.1 Fast | Google | Fast, with audio |
| `seedance-1.5-pro-t2v` | Seedance 1.5 Pro | FAL | Audio + lip-sync |
| `kling-v2.5-turbo-pro-t2v` | Kling v2.5 Turbo Pro | FAL | High quality |
| `kling-1.0-t2v-fal` | Kling 1.0 T2V | FAL | Text-to-video |
| `seedance-1-pro-t2v` | Seedance 1 Pro | FAL | Premium, 1080p, last frame |
| `hailuo-02-t2v` | Hailuo 02 | FAL | Great physics |
| `hailuo-2.3-t2v` | Hailuo 2.3 | FAL | Camera control |
| `kling-v2.1-master-t2v` | Kling v2.1 Master | FAL | Premium 1080p |
| `wan-2.5-t2v` | Wan 2.5 T2V | FAL | High quality T2V |
| `kling-v2.0-t2v` | Kling v2.0 | FAL | Basic 720p |

### Image-to-Video (14+ models)

| ID | Display Name | Provider | Key Feature |
|----|-------------|----------|-------------|
| `seedance-1.5-pro-i2v` | Seedance 1.5 Pro | FAL | Audio + lip-sync |
| `kling-v2.5-turbo-pro-i2v` | Kling v2.5 Turbo Pro | FAL | Image animation |
| `kling-1.0-i2v-fal` | Kling 1.0 I2V | FAL | First + last frame |
| `kling-2.6-motion-control-fal` | Kling 2.6 Motion Control | FAL | Motion transfer |
| `seedance-1-pro-fast` | Seedance 1 Pro Fast | FAL | Fast, up to 1080p |
| `gen4-turbo-i2v` | Runway Gen4 Turbo | Replicate | Premium animation |
| `higgsfield-dop-*` | Higgsfield DoP | Higgsfield | Admin-only, various tiers |

### Video Edit (8 models)

| ID | Display Name | Key Feature |
|----|-------------|-------------|
| `luma-modify-video` | Luma Modify | Style transformation |
| `luma-reframe-video` | Luma Reframe | Aspect ratio change |
| `mmaudio` | MMAudio | Add AI audio |
| `kling-o1-v2v-fal` | Kling O1 V2V | Reference-based generation |
| `kling-o1-edit-fal` | Kling O1 Edit | Text-based video editing |
| `video-merge` | Video Merge | Combine videos |
| `autocaption` | Autocaption | AI subtitles |
| `gen4-aleph` | Runway Gen4 Aleph | Effects and styles |

### Video Upscale (2 models)

| ID | Display Name |
|----|-------------|
| `topaz-video-upscale` | Topaz Video Upscale (up to 4K) |
| `crystal-video-upscaler` | Crystal Video Upscaler |

## Analyze Models

| ID | Action | Key Feature |
|----|--------|-------------|
| `moondream2` | describe | Fast image description, VQA |
| `llava-13b` | describe | Detailed, GPT-4 level |
| `blip-2` | describe | Universal Q&A |
| `deepseek-ocr` | ocr | 100+ languages, Markdown output |
| `text-extract-ocr` | ocr | Simple text extraction |
| `clip-interrogator` | prompt | Prompt for Stable Diffusion |
| `sdxl-clip-interrogator` | prompt | Optimized for SDXL |
| `img2prompt` | prompt | SD 1.x style prompts |

## Providers

| Provider | Models Count | Client File | Webhook Route |
|----------|-------------|-------------|--------------|
| Replicate | ~40+ | `lib/replicate/client.ts` | `/api/webhook/replicate` |
| FAL AI | ~20+ | `lib/fal/client.ts` | `/api/webhook/fal` |
| Google GenAI | ~5 | `lib/google/client.ts` | (inline, no webhook) |
| Higgsfield | ~6 | `lib/higgsfield/client.ts` | `/api/webhook/higgsfield` |

NOTE: Some Google models run via Replicate (e.g., `nano-banana` can use either provider). Provider routing is in `app/api/generations/create/route.ts`.

## Add a New Model

1. Add full config in `lib/models-config.ts` — model object with all parameters, `replicateModel` path, settings array
2. Add lite entry in `lib/models-lite.ts` — id, displayName, description, action
3. Add limits in `lib/models-limits.ts` if needed
4. Add pricing in `lib/pricing.ts` if cost differs
5. If new provider: create `lib/{provider}/client.ts`, add webhook route, update `app/api/generations/create/route.ts`
6. Test with real API call
7. Update `docs/MODELS.md` and `docs/CHANGELOG.md`

## Add a New Provider

1. Create client: `lib/{provider}/client.ts` — implement `startGeneration()` returning prediction ID
2. Create webhook: `app/api/webhook/{provider}/route.ts` — handle completion callback
3. Update routing: `app/api/generations/create/route.ts` — add provider case
4. Add env vars for API keys
5. Update `docs/DEPLOYMENT.md` (env vars) and `docs/MODELS.md`
