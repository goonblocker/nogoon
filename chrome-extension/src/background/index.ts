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
  if (message.type === 'classifyImage' && message.imageUrl) {
    handleImageClassification(message.imageUrl)
      .then(result => {
        sendResponse({ status: 'success', result });
      })
      .catch(error => {
        console.error('Error classifying image:', error.message);
        sendResponse({ status: 'error', message: error.message });
      });
    return true; // Indicates that the response is sent asynchronously
  }

  // Handle opening side panel (for paywall, etc.)
  if (message.type === 'openSidePanel') {
    console.log('[Background] Opening side panel');
    if (sender.tab?.windowId) {
      chrome.sidePanel
        .open({ windowId: sender.tab.windowId })
        .then(() => {
          console.log('[Background] Side panel opened successfully');
          sendResponse({ status: 'success' });
        })
        .catch(error => {
          console.error('[Background] Error opening side panel:', error);
          sendResponse({ status: 'error', message: error.message });
        });
      return true; // Async response
    }
  }

  // Handle other message types if needed
  return false; // Indicates synchronous response or no response
});

async function handleImageClassification(imageUrl: string): Promise<nsfwjs.PredictionType[]> {
  if (!model) {
    await loadModelPromise; // Wait for the initial loading attempt to complete
    if (!model) {
      throw new Error('NSFWJS model failed to load and is unavailable.');
    }
  }

  try {
    // Fetch the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const blob = await response.blob();

    // Use OffscreenCanvas and createImageBitmap (Service Worker compatible)
    const imageBitmap = await createImageBitmap(blob);

    // Create an OffscreenCanvas
    const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get OffscreenCanvas context');
    }

    // Draw the bitmap onto the canvas
    ctx.drawImage(imageBitmap, 0, 0);

    // Get ImageData from the canvas
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    imageBitmap.close(); // Close the bitmap to free memory

    // Classify with model
    const predictions = await model.classify(imageData);
    return predictions;
  } catch (error) {
    console.error(`Error classifying image:`, error);
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(`Classification error: ${String(error)}`);
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
