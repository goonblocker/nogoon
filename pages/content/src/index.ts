import { contentBlockingStorage, privyAuthStorage } from '@extension/storage';

console.log('Content script loaded - v4 - Background Communication');

// --- Global State ---
let isEnabled = true; // Will be synced with storage
const NSFW_THRESHOLD = 0.2; // Probability threshold for NSFW categories
const processedImages = new WeakSet<HTMLImageElement>();

// Initialize state from storage
contentBlockingStorage.get().then(state => {
  isEnabled = state.protectionActive;
  console.log('[Content Script] Protection state initialized:', isEnabled);
});

// Listen for storage changes to update isEnabled in real-time
chrome.storage.local.onChanged.addListener((changes: { [key: string]: chrome.storage.StorageChange }) => {
  if (changes['content-blocking-storage']) {
    const newState = changes['content-blocking-storage'].newValue;
    if (newState && typeof newState.protectionActive === 'boolean') {
      const oldEnabled = isEnabled;
      isEnabled = newState.protectionActive;
      console.log('[Content Script] Protection state changed:', oldEnabled, '->', isEnabled);

      // If protection was just disabled, stop observer and unwrap all images
      if (oldEnabled && !isEnabled) {
        console.log('[Content Script] Disabling protection, stopping observer and unwrapping all images...');
        stopObserver();

        document.querySelectorAll('.content-blocker-container').forEach(container => {
          const img = container.querySelector('img');
          if (img) {
            // Remove from processed set so it can be reprocessed later
            processedImages.delete(img);
            // Unwrap the image
            unwrapImage(img, container as HTMLElement);
          }
        });
      }

      // If protection was just enabled, start observer and reprocess all images
      if (!oldEnabled && isEnabled) {
        console.log('[Content Script] Re-enabling protection, starting observer and processing all images...');
        startObserver();

        // Force reprocess by clearing processed state for all existing wrapped images
        document.querySelectorAll('.content-blocker-container img').forEach(img => {
          processedImages.delete(img as HTMLImageElement);
        });

        // Process all images on the page
        document.querySelectorAll('img').forEach(img => {
          processImage(img);
        });
      }
    }
  }

  // Listen for paywall changes - when user runs out of blocks
  if (changes['privy-auth-storage']) {
    const newAuthState = changes['privy-auth-storage'].newValue;
    if (newAuthState) {
      const hitPaywall = !newAuthState.isPremium && newAuthState.freeBlocksRemaining === 0;
      if (hitPaywall) {
        console.log('[Content Script] User hit paywall (0 free blocks), stopping image processing');
        // Clear processed images so if they upgrade, images will be reprocessed
        // Note: WeakSet doesn't have a clear() method, so we just stop processing new ones
      }
    }
  }
});

// --- Styles ---
const overlayStyles = `
  .content-blocker-container {
    position: relative !important; /* Crucial for absolute positioning of overlay */
    display: inline-block !important; /* Default, adjust as needed */
    vertical-align: bottom !important; /* Align with image baseline */
    line-height: 0 !important; /* Prevent extra space below image */
    overflow: hidden !important; /* Ensure overlay doesn't extend beyond container */
    max-width: 100% !important;
  }
  .content-blocker-container img {
    display: block !important; /* Prevent extra space below image */
    max-width: 100% !important;
    height: auto !important;
  }
  .content-blocker-overlay {
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    width: 100% !important;
    height: 100% !important;
    margin: 0 !important;
    background-color: rgba(0, 0, 0, 0.6) !important;
    backdrop-filter: blur(5px) !important; /* Default blur for scanning */
    -webkit-backdrop-filter: blur(5px) !important;
    z-index: 9998 !important;
    display: flex !important;
    flex-direction: column !important;
    justify-content: center !important;
    align-items: center !important;
    text-align: center !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    font-size: 14px !important;
    font-weight: 600 !important;
    color: white !important;
    padding: 10px !important;
    box-sizing: border-box !important;
    cursor: default !important; /* Default cursor */
    opacity: 1 !important;
    transition: opacity 0.3s ease, backdrop-filter 0.3s ease, background-color 0.3s ease !important;
  }
  .content-blocker-overlay.disallowed {
    backdrop-filter: blur(25px) !important;
    -webkit-backdrop-filter: blur(25px) !important;
    background-color: rgba(0, 0, 0, 0.75) !important;
    cursor: pointer !important; /* Allow clicking to reveal */
  }
  .content-blocker-overlay .eye-icon {
    width: 48px !important;
    height: 48px !important;
    margin-bottom: 8px !important;
    opacity: 0.95 !important;
    flex-shrink: 0 !important;
    display: block !important;
    border-radius: 4px !important;
  }
  .content-blocker-overlay .message {
    font-size: 13px !important;
    line-height: 1.4 !important;
    max-width: 200px !important;
    text-shadow: 0 1px 3px rgba(0,0,0,0.5) !important;
    flex-shrink: 0 !important;
  }
  /* State for fading out when allowed (handled by removing the element) */
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = overlayStyles;
document.head.appendChild(styleSheet);

// --- Random Messages ---
const trollMessages = [
  'oh my such big boobas',
  'bro this one is worth gooning',
  'sheesh 👀 you sure about this?',
  'down catastrophically huh?',
  'someone bonk this man',
  'least horny internet user',
  'touch grass challenge failed',
  'my eyes... they need bleach',
  'you really wanna see this?',
  'certified goon moment™',
  'the council says: no',
  'begone, coomer!',
  'not on my watch chief',
];

const standardMessage = 'Blocked by NoGoon';

function getBlockMessage(): string {
  // 15% chance to show a troll message, 85% chance to show standard message
  const shouldShowTroll = Math.random() < 0.15;

  if (shouldShowTroll) {
    return trollMessages[Math.floor(Math.random() * trollMessages.length)];
  }

  return standardMessage;
}

// Booba gif icon
const boobaIconHTML = `<img src="${chrome.runtime.getURL('/booba.gif')}" class="eye-icon" alt="NoGoon" />`;

// --- Communication with Background ---
async function classifyImageWithBackground(imageUrl: string): Promise<'allowed' | 'disallowed' | 'error'> {
  console.log('[AIDEBUGLOGDETECTIVEWORK]: Entering classifyImageWithBackground for URL:', imageUrl);
  console.log('[Content Script] Sending image URL to background:', imageUrl);
  try {
    console.log('[AIDEBUGLOGDETECTIVEWORK]: Sending message to background script.');
    const response = await chrome.runtime.sendMessage({
      type: 'classifyImage',
      imageUrl: imageUrl,
    });
    console.log('[AIDEBUGLOGDETECTIVEWORK]: Received response from background:', response);

    console.log('[Content Script] Received response from background:', response);

    if (response.status === 'error') {
      console.error('[Content Script] Error from background:', response.message);
      console.error('[AIDEBUGLOGDETECTIVEWORK]: Background script reported error:', response.message);
      return 'error';
    }

    if (response.status === 'success' && response.result) {
      // Determine if NSFW based on predictions and threshold
      const isNsfw = response.result.some(
        (prediction: { className: string; probability: number }) =>
          (prediction.className === 'Porn' || prediction.className === 'Sexy' || prediction.className === 'Hentai') &&
          prediction.probability >= NSFW_THRESHOLD,
      );
      return isNsfw ? 'disallowed' : 'allowed';
    } else {
      console.error('[Content Script] Invalid response structure from background:', response);
      console.error('[AIDEBUGLOGDETECTIVEWORK]: Invalid response structure:', response);
      return 'error';
    }
  } catch (error) {
    console.error('[AIDEBUGLOGDETECTIVEWORK]: Error caught in classifyImageWithBackground:', error);
    console.error('[Content Script] Error sending message to background:', error);
    // Check for specific disconnect error which might mean the background script isn't ready
    // Fix: Cast error to check its message property safely
    if (error instanceof Error && error.message.includes('Could not establish connection')) {
      console.warn('[Content Script] Background script might be reloading or unavailable.');
      console.warn('[AIDEBUGLOGDETECTIVEWORK]: Connection error - background script might be unavailable.');
    }
    return 'error';
  }
}

// --- Overlay Management ---

/**
 * Creates the overlay div element.
 * @param text Initial text for the overlay.
 */
function createOverlayElement(text: string): HTMLDivElement {
  const overlay = document.createElement('div');
  overlay.className = 'content-blocker-overlay'; // Base class for styles
  overlay.textContent = text;
  return overlay;
}

/**
 * Wraps an image element in a container for overlay positioning.
 * @param img The image element to wrap.
 */
function wrapImage(img: HTMLImageElement): HTMLElement | null {
  if (!img.parentNode) return null;

  const wrapper = document.createElement('div');
  wrapper.className = 'content-blocker-container';
  const computedStyle = window.getComputedStyle(img);
  // Try to mimic display/alignment
  wrapper.style.display = computedStyle.display === 'inline' ? 'inline-block' : computedStyle.display;
  wrapper.style.verticalAlign = computedStyle.verticalAlign;
  // Set initial size based on image's current size (can adjust later if needed)
  wrapper.style.width = `${img.offsetWidth}px`;
  wrapper.style.height = `${img.offsetHeight}px`;

  img.parentNode.insertBefore(wrapper, img);
  wrapper.appendChild(img); // Move the image inside the wrapper
  return wrapper;
}

/**
 * Removes the wrapper and overlay, putting the image back in its original place.
 * @param img The image element.
 * @param wrapper The wrapper element.
 */
function unwrapImage(img: HTMLImageElement, wrapper: HTMLElement) {
  if (wrapper.parentNode) {
    wrapper.parentNode.insertBefore(img, wrapper); // Put image back
  }
  wrapper.remove();
}

/**
 * Processes an image: wraps it, adds a scanning overlay, sends to background for detection, and updates UI.
 * @param {HTMLImageElement} img The image element to process.
 */
async function processImage(img: HTMLImageElement) {
  // Basic checks
  console.log('[AIDEBUGLOGDETECTIVEWORK]: Entering processImage for:', img.src);
  if (
    !isEnabled ||
    processedImages.has(img) ||
    img.closest('.content-blocker-container') || // Already being processed
    !img.src ||
    img.src.startsWith('data:') || // Skip data URIs for now
    !img.src.startsWith('http') // Skip relative URLs, chrome-extension:// etc.
  ) {
    return;
  }

  // Initial dimension check
  const minDimensionInitial = 20;
  if (img.offsetWidth < minDimensionInitial && img.offsetHeight < minDimensionInitial) {
    // Don't add to processedImages yet, might become visible later
    return;
  }

  // $NoGoon MODEL: No paywall, always free, powered by token trading fees
  console.log('[Content Script] Processing image - powered by $NoGoon trading volume');

  processedImages.add(img);
  console.log('[AIDEBUGLOGDETECTIVEWORK]: Added image to processedImages:', img.src);
  console.log('[Content Script] Processing image:', img.src);

  // 1. Wrap the image
  console.log('[AIDEBUGLOGDETECTIVEWORK]: Wrapping image:', img.src);
  const wrapper = wrapImage(img);
  if (!wrapper) {
    console.warn('[Content Script] Could not wrap image:', img.src);
    processedImages.delete(img); // Allow reprocessing
    return;
  }

  // 2. Create and add the initial 'scanning' overlay
  const overlay = createOverlayElement('Scanning...');
  wrapper.appendChild(overlay);
  console.log('[AIDEBUGLOGDETECTIVEWORK]: Added scanning overlay for:', img.src);

  // 3. Wait for the image to be loaded (if not already)
  if (!img.complete) {
    try {
      console.log('[AIDEBUGLOGDETECTIVEWORK]: Image not complete, awaiting decode():', img.src);
      await img.decode(); // More modern way to wait for image load
      console.log('[AIDEBUGLOGDETECTIVEWORK]: Image decode() successful:', img.src);
    } catch (e) {
      console.log('[AIDEBUGLOGDETECTIVEWORK]: Image decode() failed:', img.src, e);
      console.log('[Content Script] Image failed to load/decode:', img.src, e);
      unwrapImage(img, wrapper);
      processedImages.delete(img); // Allow reprocessing if src changes
      return;
    }
  }

  // 4. Dimension check *after* load
  const minDimensionFinal = 30;
  if (img.naturalWidth < minDimensionFinal || img.naturalHeight < minDimensionFinal) {
    console.log(
      '[AIDEBUGLOGDETECTIVEWORK]: Skipping tiny image after load:',
      img.src,
      `(${img.naturalWidth}x${img.naturalHeight})`,
    );
    console.log(
      '[Content Script] Skipping tiny image after load:',
      img.src,
      `(${img.naturalWidth}x${img.naturalHeight})`,
    );
    unwrapImage(img, wrapper);
    // Keep in processedImages as it met initial criteria but is too small finally
    return;
  }

  // Keep wrapper size to displayed dimensions (offsetWidth/Height) for proper overlay positioning
  // This ensures the overlay centers on what's actually visible, not the natural image size
  wrapper.style.width = `${img.offsetWidth}px`;
  wrapper.style.height = `${img.offsetHeight}px`;

  // 5. Run the actual detection via background script
  try {
    // Ensure absolute URL for fetch in background script
    const absoluteUrl = new URL(img.src, document.baseURI).href;
    console.log('[AIDEBUGLOGDETECTIVEWORK]: Calling classifyImageWithBackground with absolute URL:', absoluteUrl);
    const result = await classifyImageWithBackground(absoluteUrl);
    console.log('[AIDEBUGLOGDETECTIVEWORK]: classifyImageWithBackground result:', result, 'for URL:', absoluteUrl);

    if (result === 'allowed') {
      console.log('[AIDEBUGLOGDETECTIVEWORK]: Image allowed, removing overlay for:', img.src);
      console.log('[Content Script] Image allowed:', img.src);
      overlay.style.opacity = '0';
      setTimeout(() => {
        // Check if overlay still exists before removing
        if (overlay.parentNode) {
          overlay.remove();
        }
        // Optionally unwrap if you only want the container for blocked images
        // unwrapImage(img, wrapper);
      }, 300);
    } else if (result === 'disallowed') {
      console.log('[AIDEBUGLOGDETECTIVEWORK]: Image disallowed, setting overlay text for:', img.src);
      console.log('[Content Script] Image disallowed:', img.src);

      // $NoGoon MODEL: No block limits, powered by token trading fees
      console.log('[Content Script] Block successful - powered by $NoGoon community');

      // Increment block count in storage
      contentBlockingStorage.incrementBlockCount().catch(err => {
        console.error('[Content Script] Failed to increment block count:', err);
      });

      // Track the domain where the block occurred
      const domain = window.location.hostname;
      contentBlockingStorage.addBlockedSite(domain).catch(err => {
        console.error('[Content Script] Failed to add blocked site:', err);
      });

      overlay.classList.add('disallowed');

      // Create the overlay content with booba icon and message (mostly standard, occasionally troll)
      const blockMessage = getBlockMessage();
      overlay.innerHTML = `
        ${boobaIconHTML}
        <div class="message">${blockMessage}</div>
      `;

      overlay.addEventListener(
        'click',
        () => {
          console.log('[Content Script] Revealing image:', img.src);
          if (overlay.parentNode) {
            overlay.remove();
          }
          // Optionally unwrap after reveal
          // unwrapImage(img, wrapper);
        },
        { once: true },
      );
    } else {
      // result === 'error'
      console.log('[AIDEBUGLOGDETECTIVEWORK]: Classification error, removing overlay for:', img.src);
      console.log('[Content Script] Error classifying image, removing overlay:', img.src);
      overlay.style.opacity = '0';
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.remove();
        }
        // Optionally unwrap on error
        // unwrapImage(img, wrapper);
      }, 500);
    }
  } catch (error) {
    console.error('[AIDEBUGLOGDETECTIVEWORK]: Unexpected error in processImage classification block:', error, img.src);
    console.error('[Content Script] Unexpected error during classification process:', error, img.src);
    if (overlay.parentNode) {
      overlay.textContent = 'Error';
      overlay.style.opacity = '0';
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.remove();
        }
        // Optionally unwrap on error
        // unwrapImage(img, wrapper);
      }, 500);
    }
  }
}

// --- Mutation Observer ---
let observer: MutationObserver | null = null;

function createObserver() {
  return new MutationObserver(mutations => {
    // console.log('[AIDEBUGLOGDETECTIVEWORK]: MutationObserver triggered.'); // This can be very noisy
    if (!isEnabled) return;

    mutations.forEach(mutation => {
      // Handle added nodes
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          // Process new IMG tags directly
          if (element.tagName === 'IMG') {
            // console.log('[AIDEBUGLOGDETECTIVEWORK]: New IMG detected directly:', (element as HTMLImageElement).src);
            processImage(element as HTMLImageElement);
          }
          // Process IMG tags within added subtrees
          element.querySelectorAll('img').forEach(img => {
            // console.log('[AIDEBUGLOGDETECTIVEWORK]: New IMG detected in subtree:', img.src);
            processImage(img);
          });
          // Look for background images (basic check)
          if (element instanceof HTMLElement) {
            const style = window.getComputedStyle(element);
            if (style.backgroundImage && style.backgroundImage !== 'none') {
              // TODO: Extract URL from background-image and process if it's an image
              // This is more complex due to multiple backgrounds, gradients etc.
              // console.log('Found background image on:', element);
            }
          }
        }
      });

      // Handle src attribute changes on existing IMG tags
      if (
        mutation.type === 'attributes' &&
        (mutation.attributeName === 'src' || mutation.attributeName === 'srcset') &&
        mutation.target.nodeName === 'IMG'
      ) {
        const img = mutation.target as HTMLImageElement;
        console.log(
          '[AIDEBUGLOGDETECTIVEWORK]: Attribute changed on IMG:',
          mutation.attributeName,
          'New src:',
          img.src,
        );
        // If src changes, remove from processed set and re-evaluate
        // Check if it's currently wrapped
        const wrapper = img.closest('.content-blocker-container');
        if (wrapper) {
          console.log('[Content Script] Src changed on wrapped image, unwrapping:', img.src);
          unwrapImage(img, wrapper as HTMLElement);
        }
        processedImages.delete(img);
        // Reprocess after a short delay to allow attributes to settle
        console.log('[AIDEBUGLOGDETECTIVEWORK]: Scheduling reprocess for src change:', img.src);
        setTimeout(() => processImage(img), 50);
      }
      // Handle style changes that might add a background image
      if (
        mutation.type === 'attributes' &&
        mutation.attributeName === 'style' &&
        mutation.target instanceof HTMLElement
      ) {
        const element = mutation.target as HTMLElement;
        const style = window.getComputedStyle(element);
        if (style.backgroundImage && style.backgroundImage !== 'none') {
          // TODO: Extract URL and process if new/changed and an image
          // console.log('Found potential background image change on:', element);
        }
      }
    });
  });
}

function startObserver() {
  if (!observer && isEnabled) {
    console.log('[Content Script] Starting MutationObserver...');
    observer = createObserver();
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'srcset', 'style'], // Observe src, srcset, and style changes
    });
    console.log('[Content Script] Observer started.');
  }
}

function stopObserver() {
  if (observer) {
    console.log('[Content Script] Stopping MutationObserver...');
    observer.disconnect();
    observer = null;
    console.log('[Content Script] Observer stopped.');
  }
}

// --- Initialization ---
function initializeContentScript() {
  console.log('[Content Script] Initializing content script...');
  console.log('[AIDEBUGLOGDETECTIVEWORK]: Initializing content script.');

  // Only start processing if protection is enabled
  if (isEnabled) {
    console.log('[Content Script] Protection is enabled, starting observer and processing images...');
    startObserver();

    // Process images already present on the page
    console.log('[AIDEBUGLOGDETECTIVEWORK]: Processing initially present images.');
    document.querySelectorAll('img').forEach(img => {
      processImage(img);
    });
    // Process initial background images (basic)
    document.querySelectorAll('*').forEach(element => {
      if (element instanceof HTMLElement) {
        const style = window.getComputedStyle(element);
        if (style.backgroundImage && style.backgroundImage !== 'none') {
          // TODO: Extract URL and process
          // console.log('Found initial background image on:', element);
        }
      }
    });
  } else {
    console.log('[Content Script] Protection is disabled, skipping image processing.');
  }

  console.log('[Content Script] Initialization complete.');
}

// Wait for DOM ready before initializing
if (document.readyState === 'loading') {
  console.log('[AIDEBUGLOGDETECTIVEWORK]: DOM is loading, adding DOMContentLoaded listener.');
  document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
  console.log('[AIDEBUGLOGDETECTIVEWORK]: DOM already loaded, calling initializeContentScript directly.');
  initializeContentScript();
}

// Example of calling a function from another module (if you keep sampleFunction.ts)
// import { sampleFunction } from '@src/sampleFunction';
// sampleFunction();
