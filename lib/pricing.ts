/**
 * Replicate pricing configuration
 * Hardware prices from: https://replicate.com/pricing
 * 
 * Cost calculation: predict_time (seconds) × price_per_second
 * Final price for users: (replicate_cost × 1.5) × 80 = RUB
 */

// Hardware SKU to price per second mapping (USD)
export const HARDWARE_PRICES: Record<string, number> = {
  // CPU
  'cpu': 0.000100,
  
  // Nvidia T4
  'gpu-t4': 0.000225,
  
  // Nvidia A40
  'gpu-a40-small': 0.000575,
  'gpu-a40-large': 0.000725,
  
  // Nvidia L40S
  'gpu-l40s': 0.000975,
  'gpu-l40s-2x': 0.001950,
  
  // Nvidia A100 (80GB)
  'gpu-a100-large': 0.001400,
  'gpu-a100-large-2x': 0.002800,
  'gpu-a100-large-4x': 0.005600,
  'gpu-a100-large-8x': 0.011200,
  
  // Nvidia H100
  'gpu-h100': 0.001525,
  'gpu-h100-2x': 0.003050,
  'gpu-h100-4x': 0.006100,
  'gpu-h100-8x': 0.012200,
};

// Default hardware for models that don't specify (fallback)
const DEFAULT_HARDWARE = 'gpu-a40-large';

// Known model -> hardware mappings (from Replicate model pages)
// These are approximate, as Replicate doesn't always expose this via API
export const MODEL_HARDWARE_MAP: Record<string, string> = {
  // FLUX models (typically A100)
  'black-forest-labs/flux-1.1-pro': 'gpu-a100-large',
  'black-forest-labs/flux-1.1-pro-ultra': 'gpu-a100-large',
  'black-forest-labs/flux-dev': 'gpu-a100-large',
  'black-forest-labs/flux-schnell': 'gpu-a100-large',
  'black-forest-labs/flux-pro': 'gpu-a100-large',
  'black-forest-labs/flux-fill-pro': 'gpu-a100-large',
  'black-forest-labs/flux-canny-pro': 'gpu-a100-large',
  'black-forest-labs/flux-depth-pro': 'gpu-a100-large',
  'black-forest-labs/flux-redux-dev': 'gpu-a100-large',
  
  // Recraft models
  'recraft-ai/recraft-v3': 'gpu-a100-large',
  'recraft-ai/recraft-v3-svg': 'gpu-a100-large',
  
  // Ideogram
  'ideogram-ai/ideogram-v2': 'gpu-a100-large',
  'ideogram-ai/ideogram-v2-turbo': 'gpu-a100-large',
  
  // Video models (typically H100 or multiple GPUs)
  'minimax/video-01': 'gpu-h100',
  'minimax/video-01-live': 'gpu-h100',
  'google/veo-2': 'gpu-h100',
  'luma/ray': 'gpu-h100',
  'luma/ray-2': 'gpu-h100',
  'fofr/ltx-video': 'gpu-a100-large',
  'tencent/hunyuan-video': 'gpu-h100',
  'wan-video/wan-2.1': 'gpu-h100',
  'kwaivgi/kling-v1.6-pro': 'gpu-h100',
  'kwaivgi/kling-v2-master': 'gpu-h100',
  'seedance/seedance-1.0': 'gpu-h100',
  'genmo/mochi-1': 'gpu-h100',
  
  // Upscale models (typically L40S or A40)
  'philz1337x/clarity-upscaler': 'gpu-l40s',
  'nightmareai/real-esrgan': 'gpu-t4',
  'cjwbw/real-esrgan': 'gpu-t4',
  'lucataco/real-esrgan-video': 'gpu-a40-large',
  'batouresearch/magic-image-refiner': 'gpu-a40-large',
  
  // Remove background (typically T4 or CPU)
  'lucataco/remove-bg': 'gpu-t4',
  'cjwbw/rembg': 'cpu',
  
  // Inpaint/Edit models
  'stability-ai/stable-diffusion-inpainting': 'gpu-a40-large',
  'ideogram-ai/ideogram-v2-edit': 'gpu-a100-large',
  
  // Analyze models (typically T4)
  'salesforce/blip': 'gpu-t4',
  'yorickvp/llava-13b': 'gpu-a40-large',
  'meta/llama-3.2-90b-vision': 'gpu-h100',
};

/**
 * Get hardware type for a model
 */
export function getModelHardware(replicateModel: string): string {
  // Check exact match first
  if (MODEL_HARDWARE_MAP[replicateModel]) {
    return MODEL_HARDWARE_MAP[replicateModel];
  }
  
  // Check partial match (model name without version)
  const modelBase = replicateModel.split(':')[0];
  if (MODEL_HARDWARE_MAP[modelBase]) {
    return MODEL_HARDWARE_MAP[modelBase];
  }
  
  // Check by model family
  const modelLower = replicateModel.toLowerCase();
  
  if (modelLower.includes('flux')) {
    return 'gpu-a100-large';
  }
  if (modelLower.includes('video') || modelLower.includes('kling') || modelLower.includes('wan') || modelLower.includes('veo')) {
    return 'gpu-h100';
  }
  if (modelLower.includes('upscale') || modelLower.includes('esrgan')) {
    return 'gpu-t4';
  }
  if (modelLower.includes('remove-bg') || modelLower.includes('rembg')) {
    return 'gpu-t4';
  }
  
  return DEFAULT_HARDWARE;
}

/**
 * Calculate cost in USD from predict_time and model
 */
export function calculateCostUsd(
  predictTimeSeconds: number,
  replicateModel: string
): number {
  const hardware = getModelHardware(replicateModel);
  const pricePerSecond = HARDWARE_PRICES[hardware] || HARDWARE_PRICES[DEFAULT_HARDWARE];
  
  return predictTimeSeconds * pricePerSecond;
}

/**
 * Convert USD cost to RUB with markup
 * Formula: (cost_usd * 1.5) * 80
 */
export function convertToRubWithMarkup(costUsd: number): number {
  const MARKUP_MULTIPLIER = 1.5; // 50% markup
  const USD_TO_RUB = 80;
  
  return costUsd * MARKUP_MULTIPLIER * USD_TO_RUB;
}

/**
 * Calculate final cost in RUB from predict_time and model
 */
export function calculateCostRub(
  predictTimeSeconds: number,
  replicateModel: string
): number {
  const costUsd = calculateCostUsd(predictTimeSeconds, replicateModel);
  return convertToRubWithMarkup(costUsd);
}

/**
 * Format cost for display
 */
export function formatCostRub(costRub: number): string {
  if (costRub < 1) {
    return `${costRub.toFixed(2)}₽`;
  }
  return `${Math.round(costRub).toLocaleString('ru-RU')}₽`;
}

/**
 * Format cost in USD for display
 */
export function formatCostUsd(costUsd: number): string {
  if (costUsd < 0.01) {
    return `$${costUsd.toFixed(4)}`;
  }
  return `$${costUsd.toFixed(2)}`;
}
