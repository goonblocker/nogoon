import 'webextension-polyfill';
import * as nsfwjs from 'nsfwjs';
import * as tf from '@tensorflow/tfjs';
import { exampleThemeStorage } from '@extension/storage';

// --- NSFWJS Setup ---
let model: nsfwjs.NSFWJS | null = null;
const loadModelPromise = loadNsfwModel(); // Start loading the model immediately

async function loadNsfwModel() {
  try {
    // Revert to loading from the local public folder
    console.log('Loading NSFWJS model (local)...');
    await tf.ready(); // Ensure tfjs backend is ready
    // Load the default MobileNetV2 model (224x224) from the '/nsfw_model/' directory
    // within the extension's packaged files.
    // *** IMPORTANT: You MUST place the downloaded model.json and *.bin files
    // *** into the `chrome-extension/public/nsfw_model/` directory.
    model = await nsfwjs.load('/nsfw_model/', { size: 224 }); // Use 224 for MobileNetV2
    console.log('NSFWJS model loaded successfully.');
  } catch (error) {
    console.error('Error loading NSFWJS model:', error);
    model = null; // Ensure model is null if loading failed
  }
}

// --- Message Listener ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[AIDEBUGLOGDETECTIVEWORK]: Background script received message:', message);
  if (message.type === 'classifyImage' && message.imageUrl) {
    console.log('[Received classifyImage request for:', message.imageUrl);
    console.log('[AIDEBUGLOGDETECTIVEWORK]: Processing classifyImage request for URL:', message.imageUrl);
    handleImageClassification(message.imageUrl)
      .then(result => {
        console.log(
          '[AIDEBUGLOGDETECTIVEWORK]: Sending success response for URL:',
          message.imageUrl,
          'Result:',
          result,
        );
        sendResponse({ status: 'success', result });
      })
      .catch(error => {
        console.error(
          '[AIDEBUGLOGDETECTIVEWORK]: Sending error response for URL:',
          message.imageUrl,
          'Error:',
          error.message,
        );
        console.error('Error handling image classification:', error);
        sendResponse({ status: 'error', message: error.message });
      });
    return true; // Indicates that the response is sent asynchronously
  }
  // Handle other message types if needed
  return false; // Indicates synchronous response or no response
});

async function handleImageClassification(imageUrl: string): Promise<nsfwjs.PredictionType[]> {
  console.log('[AIDEBUGLOGDETECTIVEWORK]: Entering handleImageClassification for URL:', imageUrl);
  if (!model) {
    console.log('Model not loaded yet, waiting...');
    console.log('[AIDEBUGLOGDETECTIVEWORK]: Model not loaded, awaiting loadModelPromise.');
    await loadModelPromise; // Wait for the initial loading attempt to complete
    if (!model) {
      console.error('[AIDEBUGLOGDETECTIVEWORK]: Model still null after waiting. Throwing error.');
      throw new Error('NSFWJS model failed to load and is unavailable.');
    }
    console.log('[AIDEBUGLOGDETECTIVEWORK]: Model loaded after wait, proceeding.');
    console.log('Model loaded, proceeding with classification.');
  }

  try {
    // Fetch the image
    console.log('[AIDEBUGLOGDETECTIVEWORK]: Fetching image blob for URL:', imageUrl);
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error(
        '[AIDEBUGLOGDETECTIVEWORK]: Fetch failed:',
        response.status,
        response.statusText,
        'for URL:',
        imageUrl,
      );
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const blob = await response.blob();
    console.log(
      '[AIDEBUGLOGDETECTIVEWORK]: Image blob fetched successfully for URL:',
      imageUrl,
      'Type:',
      blob.type,
      'Size:',
      blob.size,
    );

    // --- Use OffscreenCanvas and createImageBitmap (Service Worker compatible) ---
    console.log('[AIDEBUGLOGDETECTIVEWORK]: Creating ImageBitmap from blob for URL:', imageUrl);
    const imageBitmap = await createImageBitmap(blob);
    console.log('[AIDEBUGLOGDETECTIVEWORK]: ImageBitmap created:', imageBitmap.width, 'x', imageBitmap.height);

    // Create an OffscreenCanvas
    const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('[AIDEBUGLOGDETECTIVEWORK]: Failed to get OffscreenCanvas 2D context.');
      throw new Error('Failed to get OffscreenCanvas context');
    }

    // Draw the bitmap onto the canvas
    console.log('[AIDEBUGLOGDETECTIVEWORK]: Drawing ImageBitmap onto OffscreenCanvas.');
    ctx.drawImage(imageBitmap, 0, 0);

    // Get ImageData from the canvas
    console.log('[AIDEBUGLOGDETECTIVEWORK]: Getting ImageData from OffscreenCanvas.');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    console.log('[AIDEBUGLOGDETECTIVEWORK]: ImageData obtained, closing ImageBitmap.');
    imageBitmap.close(); // Close the bitmap to free memory

    console.log('[AIDEBUGLOGDETECTIVEWORK]: Classifying with model using ImageData for URL:', imageUrl);
    console.log('Classifying image:', imageUrl);
    const predictions = await model.classify(imageData); // Classify ImageData
    console.log('[AIDEBUGLOGDETECTIVEWORK]: Classification successful for:', imageUrl);
    console.log('Classification complete for:', imageUrl, predictions);
    return predictions;
  } catch (error) {
    console.error(
      '[AIDEBUGLOGDETECTIVEWORK]: Error caught in handleImageClassification catch block for URL:',
      imageUrl,
      'Error:',
      error,
    );
    console.error(`Error classifying image ${imageUrl}:`, error);
    // Ensure the error object has a message property before re-throwing
    if (error instanceof Error) {
      throw error;
    } else {
      // Handle cases where the caught object isn't a standard Error
      throw new Error(`An unknown error occurred during classification: ${String(error)}`);
    }
  }
}

// --- Side Panel Setup ---
// Configure the side panel to open when the action icon is clicked
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch(error => console.error('Error setting side panel behavior:', error));

console.log('Side panel configured to open on action click.');

// --- Existing Code ---
// Keep other background script logic like theme storage if needed
exampleThemeStorage.get().then(theme => {
  console.log('Initial theme:', theme);
});

console.log('Background service worker loaded.');
console.log("Edit 'chrome-extension/src/background/index.ts' and save to reload.");
