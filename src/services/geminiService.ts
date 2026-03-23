import { GoogleGenAI, GenerateContentResponse, Modality, ThinkingLevel } from "@google/genai";

const getAI = () => {
  // Use process.env.API_KEY if available (user-selected key), otherwise fallback to GEMINI_API_KEY
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  return new GoogleGenAI({ apiKey });
};

export const generateChatResponse = async (prompt: string, mode: string = 'chat'): Promise<string> => {
  try {
    const ai = getAI();
    let model = "gemini-3.1-pro-preview";
    let config: any = {};

    if (mode === 'math' || mode === 'research') {
      config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
      if (mode === 'research') {
        config.tools = [{ urlContext: {} }];
      }
    } else if (mode === 'chat') {
      model = "gemini-2.5-flash";
    }

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config
    });
    return response.text || "No response generated.";
  } catch (error) {
    console.error("Error generating chat response:", error);
    return "An error occurred while generating the response.";
  }
};

export const generateChatResponseStream = async (prompt: string, mode: string = 'chat', onChunk: (chunk: string) => void): Promise<void> => {
  try {
    const ai = getAI();
    let model = "gemini-3.1-pro-preview";
    let config: any = {};

    if (mode === 'math' || mode === 'research') {
      config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
      if (mode === 'research') {
        config.tools = [{ urlContext: {} }];
      }
    } else if (mode === 'chat') {
      model = "gemini-2.5-flash";
    }

    const response = await ai.models.generateContentStream({
      model,
      contents: prompt,
      config
    });

    for await (const chunk of response) {
      if (chunk.text) {
        onChunk(chunk.text);
      }
    }
  } catch (error) {
    console.error("Error generating chat response stream:", error);
    onChunk("\n\n[Error occurred during streaming]");
  }
};

export const generateImage = async (prompt: string, size: string = "1K", aspectRatio: string = "1:1"): Promise<string | null> => {
  const tryGenerate = async (modelName: string) => {
    try {
      const ai = getAI();
      const config: any = {
        imageConfig: {
          aspectRatio,
        }
      };

      if (modelName.includes('gemini-3')) {
        config.imageConfig.imageSize = size;
      }

      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [{ text: prompt }],
        },
        config,
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      return null;
    } catch (error: any) {
      if (error?.status === 'PERMISSION_DENIED' || error?.code === 403) {
        console.warn(`Permission denied for model ${modelName}, falling back...`);
        return 'FALLBACK';
      }
      console.error(`Error generating image with ${modelName}:`, error);
      return null;
    }
  };

  // Prioritize gemini-2.5-flash-image as requested
  const result = await tryGenerate('gemini-2.5-flash-image');
  if (result !== 'FALLBACK' && result !== null) return result;

  // Fallback to pro model if API key is available and 2.5 failed
  if (process.env.API_KEY) {
    const proResult = await tryGenerate('gemini-3.1-flash-image-preview');
    if (proResult !== 'FALLBACK' && proResult !== null) return proResult;
  }

  return null;
};

export const generateVideo = async (prompt: string, imageBase64?: string): Promise<string | null> => {
  try {
    const ai = getAI();
    let operation;
    if (imageBase64) {
      operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt,
        image: {
          imageBytes: imageBase64.split(',')[1] || imageBase64,
          mimeType: 'image/png',
        },
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        }
      });
    } else {
      operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        }
      });
    }

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({operation: operation});
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) return null;

    return downloadLink;
  } catch (error) {
    console.error("Error generating video:", error);
    return null;
  }
};

export const searchWeb = async (prompt: string): Promise<string> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    return response.text || "No search results found.";
  } catch (error) {
    console.error("Error searching web:", error);
    return "An error occurred while searching.";
  }
};

export const searchMaps = async (prompt: string): Promise<string> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
      },
    });
    return response.text || "No map results found.";
  } catch (error) {
    console.error("Error searching maps:", error);
    return "An error occurred while searching maps.";
  }
};

export const searchYouTube = async (query: string): Promise<string> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Find a relevant YouTube video for: ${query}. Please provide the full YouTube URL in your response.`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    return response.text || "No video found.";
  } catch (error) {
    console.error("Error searching YouTube:", error);
    return "An error occurred while searching for the video.";
  }
};

export const analyzeImage = async (prompt: string, imageBase64: string): Promise<string> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: imageBase64.split(',')[1] || imageBase64,
              mimeType: 'image/jpeg',
            },
          },
          { text: prompt },
        ],
      },
    });
    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("Error analyzing image:", error);
    return "An error occurred while analyzing the image.";
  }
};

export const analyzeMedia = async (prompt: string, base64Data: string, mimeType: string): Promise<string> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data.split(',')[1] || base64Data,
              mimeType: mimeType,
            },
          },
          { text: prompt || "Analyze this media." },
        ],
      },
    });
    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("Error analyzing media:", error);
    return "An error occurred while analyzing the media.";
  }
};

const createWavHeader = (pcmDataLength: number, sampleRate: number = 24000) => {
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);

  // RIFF identifier
  view.setUint32(0, 0x52494646, false);
  // file length
  view.setUint32(4, 36 + pcmDataLength, true);
  // RIFF type
  view.setUint32(8, 0x57415645, false);
  // format chunk identifier
  view.setUint32(12, 0x666d7420, false);
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw)
  view.setUint16(20, 1, true);
  // channel count
  view.setUint16(22, 1, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * 2, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  view.setUint32(36, 0x64617461, false);
  // data chunk length
  view.setUint32(40, pcmDataLength, true);

  return new Uint8Array(buffer);
};

export const generateSpeech = async (text: string): Promise<string | null> => {
  let attempts = 0;
  const maxAttempts = 2;

  // Truncate text to avoid the 8192 token limit (~32,000 characters)
  // We'll use a conservative 20,000 character limit to be safe.
  const safeText = text.length > 20000 ? text.substring(0, 20000) + "..." : text;

  while (attempts < maxAttempts) {
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: safeText }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        // The model returns raw PCM (16-bit, mono, 24kHz)
        // To play it in a browser, we wrap it in a WAV header
        const pcmData = Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0));
        const wavHeader = createWavHeader(pcmData.length, 24000);
        
        const wavData = new Uint8Array(wavHeader.length + pcmData.length);
        wavData.set(wavHeader);
        wavData.set(pcmData, wavHeader.length);
        
        const blob = new Blob([wavData], { type: 'audio/wav' });
        return URL.createObjectURL(blob);
      }
      return null;
    } catch (error: any) {
      attempts++;
      console.error(`Error generating speech (attempt ${attempts}):`, error);
      if (attempts >= maxAttempts) return null;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return null;
};
