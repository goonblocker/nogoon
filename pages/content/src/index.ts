import { contentBlockingStorage, privyAuthStorage } from '@extension/storage';

console.log('Content script loaded - v5 - Performance Optimized');

// --- Global State ---
let isEnabled = true; // Will be synced with storage
const NSFW_THRESHOLD = 0.2; // Probability threshold for NSFW categories
const processedImages = new WeakSet<HTMLImageElement>();
const processingQueue = new Set<string>(); // Track URLs being processed to avoid duplicates
let activeProcessingCount = 0; // Track concurrent processing
const MAX_CONCURRENT_PROCESSING = 3; // Limit concurrent image processing

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

// --- Helper Functions for Performance ---

/**
 * Check if an image is likely non-content (ads, tracking pixels, icons, etc.)
 * Skip these to improve performance
 */
function isLikelyNonContentImage(img: HTMLImageElement): boolean {
  const src = img.src.toLowerCase();
  const width = img.naturalWidth || img.offsetWidth;
  const height = img.naturalHeight || img.offsetHeight;

  // Skip very small images (likely tracking pixels, icons)
  if (width < 100 || height < 100) {
    return true;
  }

  // Skip common ad/tracking/icon domains and patterns
  const skipPatterns = [
    'doubleclick.net',
    'google-analytics.com',
    'googletagmanager.com',
    'facebook.com/tr',
    'analytics.',
    '/pixel.',
    '/tracking.',
    '/beacon.',
    'favicon',
    '.ico',
    '.svg',
    '/logo',
    '/icon',
  ];

  if (skipPatterns.some(pattern => src.includes(pattern))) {
    return true;
  }

  // Skip if image has class names suggesting it's UI/chrome
  const className = img.className.toLowerCase();
  if (
    className.includes('icon') ||
    className.includes('logo') ||
    className.includes('avatar') ||
    className.includes('badge')
  ) {
    return true;
  }

  return false;
}

/**
 * Throttle function to limit how often a function can be called
 */
function throttle<T extends (...args: any[]) => any>(func: T, limit: number): T {
  let inThrottle: boolean;
  return function (this: any, ...args: any[]) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  } as T;
}

// --- Communication with Background ---
async function classifyImageWithBackground(imageUrl: string): Promise<'allowed' | 'disallowed' | 'error'> {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'classifyImage',
      imageUrl: imageUrl,
    });

    if (response.status === 'error') {
      console.error('[Content Script] Classification error:', response.message);
      return 'error';
    }

    if (response.status === 'success' && response.result) {
      // Determine if NSFW based on predictions and threshold
      const isNsfw = response.result.some(
        (prediction: { className: string; probability: number }) =>
          (prediction.className === 'Porn' || prediction.className === 'Sexy' || prediction.className === 'Hentai') &&
          prediction.probability >= NSFW_THRESHOLD,
      );
      const result = isNsfw ? 'disallowed' : 'allowed';
      console.log(`[Content Script] Image classified as ${result}:`, imageUrl.substring(0, 50));
      return result;
    } else {
      console.error('[Content Script] Invalid response from background');
      return 'error';
    }
  } catch (error) {
    // Check for specific disconnect error which might mean the background script isn't ready
    if (error instanceof Error && error.message.includes('Could not establish connection')) {
      console.warn('[Content Script] Background script unavailable');
    } else {
      console.error('[Content Script] Classification error:', error);
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
  if (
    !isEnabled ||
    processedImages.has(img) ||
    img.closest('.content-blocker-container') || // Already being processed
    !img.src ||
    img.src.startsWith('data:') || // Skip data URIs
    !img.src.startsWith('http') // Skip relative URLs, chrome-extension:// etc.
  ) {
    return;
  }

  // Skip non-content images for better performance
  if (isLikelyNonContentImage(img)) {
    processedImages.add(img); // Mark as processed so we don't check again
    return;
  }

  // Initial dimension check
  const minDimensionInitial = 100; // Increased from 20 to 100 for performance
  if (img.offsetWidth < minDimensionInitial && img.offsetHeight < minDimensionInitial) {
    // Don't add to processedImages yet, might become visible later
    return;
  }

  // Check if we're already processing this URL
  const imageUrl = img.src;
  if (processingQueue.has(imageUrl)) {
    console.log('[Content Script] Already processing this URL, skipping:', imageUrl);
    return;
  }

  // Limit concurrent processing to avoid overwhelming the page
  if (activeProcessingCount >= MAX_CONCURRENT_PROCESSING) {
    console.log('[Content Script] Max concurrent processing reached, queuing for later');
    // Try again after a delay
    setTimeout(() => processImage(img), 500);
    return;
  }

  processedImages.add(img);
  processingQueue.add(imageUrl);
  activeProcessingCount++;

  // Cleanup helper
  const cleanup = () => {
    processingQueue.delete(imageUrl);
    activeProcessingCount = Math.max(0, activeProcessingCount - 1);
  };

  // 1. Wrap the image
  const wrapper = wrapImage(img);
  if (!wrapper) {
    processedImages.delete(img);
    cleanup();
    return;
  }

  // 2. Create and add the initial 'scanning' overlay
  const overlay = createOverlayElement('Scanning...');
  wrapper.appendChild(overlay);

  try {
    // 3. Wait for the image to be loaded (if not already)
    if (!img.complete) {
      try {
        await img.decode(); // More modern way to wait for image load
      } catch (e) {
        console.log('[Content Script] Image failed to load/decode:', img.src, e);
        unwrapImage(img, wrapper);
        processedImages.delete(img); // Allow reprocessing if src changes
        cleanup();
        return;
      }
    }

    // 4. Dimension check *after* load
    const minDimensionFinal = 100; // Increased from 30 to 100
    if (img.naturalWidth < minDimensionFinal || img.naturalHeight < minDimensionFinal) {
      console.log(
        '[Content Script] Skipping small image after load:',
        img.src,
        `(${img.naturalWidth}x${img.naturalHeight})`,
      );
      unwrapImage(img, wrapper);
      cleanup();
      // Keep in processedImages as it met initial criteria but is too small finally
      return;
    }

    // Keep wrapper size to displayed dimensions
    wrapper.style.width = `${img.offsetWidth}px`;
    wrapper.style.height = `${img.offsetHeight}px`;

    // 5. Run the actual detection via background script
    const absoluteUrl = new URL(img.src, document.baseURI).href;
    const result = await classifyImageWithBackground(absoluteUrl);

    if (result === 'allowed') {
      console.log('[Content Script] Image allowed:', img.src);
      overlay.style.opacity = '0';
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.remove();
        }
        cleanup();
      }, 300);
    } else if (result === 'disallowed') {
      console.log('[Content Script] Image blocked:', img.src);

      // Increment block count in storage
      await contentBlockingStorage.incrementBlockCount().catch(err => {
        console.error('[Content Script] Failed to increment block count:', err);
      });

      // Track the domain where the block occurred
      const domain = window.location.hostname;
      await contentBlockingStorage.addBlockedSite(domain).catch(err => {
        console.error('[Content Script] Failed to add blocked site:', err);
      });

      overlay.classList.add('disallowed');

      // Create the overlay content with booba icon and message
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
        },
        { once: true },
      );

      cleanup();
    } else {
      // result === 'error'
      console.log('[Content Script] Error classifying image, removing overlay:', img.src);
      overlay.style.opacity = '0';
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.remove();
        }
        cleanup();
      }, 500);
    }
  } catch (error) {
    console.error('[Content Script] Unexpected error during classification process:', error);
    const errorOverlay = wrapper.querySelector('.content-blocker-overlay');
    if (errorOverlay) {
      errorOverlay.textContent = 'Error';
      (errorOverlay as HTMLElement).style.opacity = '0';
      setTimeout(() => {
        if (errorOverlay.parentNode) {
          errorOverlay.remove();
        }
      }, 500);
    }
    cleanup();
  }
}

// --- Mutation Observer ---
let observer: MutationObserver | null = null;
let mutationBuffer: HTMLImageElement[] = [];
let mutationTimeout: number | null = null;

// Debounced mutation handler - processes images in batches instead of one-by-one
function processMutationBuffer() {
  if (mutationBuffer.length === 0) return;

  console.log(`[Content Script] Processing ${mutationBuffer.length} new images from mutations`);
  const imagesToProcess = [...mutationBuffer];
  mutationBuffer = [];

  // Process in small batches to avoid blocking
  imagesToProcess.forEach((img, index) => {
    setTimeout(() => processImage(img), index * 50); // Stagger by 50ms
  });
}

function createObserver() {
  return new MutationObserver(mutations => {
    if (!isEnabled) return;

    mutations.forEach(mutation => {
      // Handle added nodes - only look for IMG tags
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;

          // Process new IMG tags directly
          if (element.tagName === 'IMG') {
            mutationBuffer.push(element as HTMLImageElement);
          }

          // Process IMG tags within added subtrees - but limit depth
          if (element.children.length > 0 && element.children.length < 50) {
            // Avoid huge subtrees
            element.querySelectorAll('img').forEach(img => {
              mutationBuffer.push(img);
            });
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
        // If src changes, remove from processed set and re-evaluate
        const wrapper = img.closest('.content-blocker-container');
        if (wrapper) {
          unwrapImage(img, wrapper as HTMLElement);
        }
        processedImages.delete(img);
        // Add to buffer for batch processing
        mutationBuffer.push(img);
      }
    });

    // Debounce: process buffer after mutations settle
    if (mutationTimeout) {
      clearTimeout(mutationTimeout);
    }
    mutationTimeout = window.setTimeout(processMutationBuffer, 200);
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

  // Only start processing if protection is enabled
  if (isEnabled) {
    console.log('[Content Script] Protection is enabled, starting observer...');
    startObserver();

    // Process images already present on the page - use throttled batch processing
    console.log('[Content Script] Processing initially present images...');
    const images = Array.from(document.querySelectorAll('img'));
    console.log(`[Content Script] Found ${images.length} images to process`);

    // Process images in batches to avoid overwhelming the page
    let processedCount = 0;
    const batchSize = 5;

    function processBatch() {
      const batch = images.slice(processedCount, processedCount + batchSize);
      batch.forEach(img => processImage(img));
      processedCount += batch.length;

      if (processedCount < images.length) {
        // Continue with next batch after a delay
        setTimeout(processBatch, 100);
      } else {
        console.log('[Content Script] Initial image processing complete.');
      }
    }

    // Start processing in batches
    processBatch();
  } else {
    console.log('[Content Script] Protection is disabled, skipping image processing.');
  }

  console.log('[Content Script] Initialization started.');
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
