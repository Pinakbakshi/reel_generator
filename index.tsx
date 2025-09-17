/* tslint:disable */
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI, Type } from '@google/genai';

interface Clip {
  title: string;
  startTime: number;
  endTime: number;
  captions: string;
}

const GEMINI_API_KEY = process.env.API_KEY;

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      resolve(url.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function analyzeVideo(videoFile: File) {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const videoBase64 = await fileToBase64(videoFile);

  const schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: 'A short, catchy title for the clip (max 5 words).',
        },
        startTime: {
          type: Type.NUMBER,
          description: 'The start time of the clip in seconds.',
        },
        endTime: {
          type: Type.NUMBER,
          description: 'The end time of the clip in seconds.',
        },
        captions: {
          type: Type.STRING,
          description:
            'The transcribed captions for any spoken words in the clip.',
        },
      },
      required: ['title', 'startTime', 'endTime', 'captions'],
    },
  };

  const prompt = `Analyze this video and identify up to 5 of the most engaging, visually appealing, or emotionally impactful moments. For each moment, create a 10-second clip. The clips should not overlap.

Provide the output as a JSON array of objects that adheres to the provided schema. Each object in the array should represent one clip.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        { text: prompt },
        {
          inlineData: {
            data: videoBase64,
            mimeType: videoFile.type,
          },
        },
      ],
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema,
    },
  });

  try {
    const jsonText = response.text.trim();
    const clips: Clip[] = JSON.parse(jsonText);
    return clips;
  } catch (e) {
    console.error('Failed to parse JSON response:', response.text);
    throw new Error('The AI returned an invalid response. Please try again.');
  }
}

// --- DOM Elements ---
const uploadInput = document.querySelector('#file-input') as HTMLInputElement;
const analyzeButton = document.querySelector(
  '#analyze-button',
) as HTMLButtonElement;
const statusEl = document.querySelector('#status') as HTMLDivElement;
const videoPlayer = document.querySelector('#video-player') as HTMLVideoElement;
const clipsContainer = document.querySelector(
  '#clips-container',
) as HTMLDivElement;
const errorModal = document.querySelector('#error-modal') as HTMLDivElement;
const errorMessageContainer = document.querySelector(
  '#error-message-container',
) as HTMLDivElement;
const modalAddKeyButton = document.querySelector(
  '#modal-add-key-button',
) as HTMLButtonElement;
const modalCloseButton = document.querySelector(
  '#modal-close-button',
) as HTMLButtonElement;

let currentVideoFile: File | null = null;
let stopTime = -1;

// --- Event Listeners ---
uploadInput.addEventListener('change', (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    currentVideoFile = file;
    const objectURL = URL.createObjectURL(file);
    videoPlayer.src = objectURL;
    videoPlayer.style.display = 'block';
    analyzeButton.disabled = false;
    statusEl.textContent = 'Video ready. Click "Analyze Video" to start.';
    clipsContainer.innerHTML =
      '<p class="placeholder">Your generated clips will appear here.</p>';
  }
});

analyzeButton.addEventListener('click', () => {
  if (currentVideoFile) {
    runAnalysis();
  }
});

videoPlayer.addEventListener('timeupdate', () => {
  if (stopTime > 0 && videoPlayer.currentTime >= stopTime) {
    videoPlayer.pause();
    stopTime = -1;
    document
      .querySelector('.clip-card.active')
      ?.classList.remove('active');
  }
});

modalCloseButton.addEventListener('click', () => {
  errorModal.style.display = 'none';
});

modalAddKeyButton.addEventListener('click', async () => {
  await window.aistudio?.openSelectKey();
  errorModal.style.display = 'none';
});

// --- Functions ---
function showErrorModal(messages: string[]) {
  errorMessageContainer.innerHTML = '';
  messages.forEach((msg) => {
    const p = document.createElement('p');
    p.textContent = msg;
    errorMessageContainer.appendChild(p);
  });
  errorModal.style.display = 'flex';
}

function renderClips(clips: Clip[]) {
  clipsContainer.innerHTML = ''; // Clear placeholder or previous results
  if (clips.length === 0) {
    clipsContainer.innerHTML =
      '<p class="placeholder">The AI could not find any distinct clips. Try another video.</p>';
    return;
  }

  clips.forEach((clip, index) => {
    const card = document.createElement('div');
    card.className = 'clip-card';
    card.innerHTML = `
      <h3>${clip.title}</h3>
      <div class="timestamp">${clip.startTime.toFixed(
        1,
      )}s - ${clip.endTime.toFixed(1)}s</div>
      <p class="captions">"${clip.captions || 'No captions generated.'}"</p>
    `;

    card.addEventListener('click', () => {
      document
        .querySelector('.clip-card.active')
        ?.classList.remove('active');
      card.classList.add('active');
      videoPlayer.currentTime = clip.startTime;
      stopTime = clip.endTime;
      videoPlayer.play();
    });

    clipsContainer.appendChild(card);
  });
}

async function runAnalysis() {
  if (!currentVideoFile) return;

  statusEl.textContent = 'Analyzing video... This may take a few moments.';
  clipsContainer.innerHTML =
    '<p class="placeholder">AI is working its magic...</p>';
  analyzeButton.disabled = true;
  uploadInput.disabled = true;

  try {
    const clips = await analyzeVideo(currentVideoFile);
    renderClips(clips);
    statusEl.textContent = 'Analysis complete. Click on a clip to preview.';
  } catch (e: any) {
    console.error('Video analysis failed:', e);
    showErrorModal([e.message || 'An unknown error occurred.']);
    statusEl.textContent = 'Error analyzing video.';
  } finally {
    analyzeButton.disabled = false;
    uploadInput.disabled = false;
  }
}
