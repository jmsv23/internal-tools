export interface ImageGenerationInput {
  prompt: string;
  negative_prompt?: string;
  size?: string; // format: "width*height"
  seed?: number;
  enable_safety_checker?: boolean;
}

export interface ImageGenerationOutput {
  result: string;
  cost: number;
}

export interface ImageGenerationResponse {
  id: string;
  status: string;
  delayTime: number;
  executionTime: number;
  workerId: string;
  output?: ImageGenerationOutput;
  error?: string;
}

function getRunPodClient() {
  const apiKey = process.env.RUNPOD_API_KEY;
  if (!apiKey) {
    throw new Error("RUNPOD_API_KEY environment variable is required");
  }
  return { apiKey };
}

// Lazy initialization to allow build without API key
let _runPodClient: ReturnType<typeof getRunPodClient> | null = null;

export function getRunPod() {
  if (!_runPodClient) {
    _runPodClient = getRunPodClient();
  }
  return _runPodClient;
}

export const RUNPOD_ENDPOINTS = {
  seedreamV4T2I: "https://api.runpod.ai/v2/seedream-v4-t2i/runsync",
} as const;

export async function generateImage(input: ImageGenerationInput): Promise<ImageGenerationResponse> {
  const { apiKey } = getRunPod();
  
  const requestBody = {
    input: {
      prompt: input.prompt,
      negative_prompt: input.negative_prompt || "",
      size: input.size || "1024*1024",
      seed: input.seed || -1,
      enable_safety_checker: input.enable_safety_checker !== false,
    },
  };

  try {
    const response = await fetch(RUNPOD_ENDPOINTS.seedreamV4T2I, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`RunPod API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error calling RunPod API:", error);
    throw error;
  }
}