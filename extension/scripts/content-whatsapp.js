
// Content Script for WhatsApp Web
// Runs on web.whatsapp.com

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'EXTRACT_CURRENT_CONTACT') {
        handleExtraction(sendResponse);
        return true; // async response
    }
});

function handleExtraction(sendResponse) {
    try {
        const data = extractContactInfo();
        console.log('[CRM Clipper] Data extracted:', data);
        sendResponse({ success: true, data });
    } catch (error) {
        console.error('[CRM Clipper] Extraction failed:', error);
        sendResponse({ success: false, error: error.message });
    }
}

function extractContactInfo() {
    // Selectors for WhatsApp Web DOM (subject to change by Meta)
    // Header of the active chat
    const header = document.querySelector('header');
    if (!header) throw new Error('No active chat found');

    // Name is usually in a span or div with specific classes
    // We look for text content in the header
    const infoContainer = header.querySelector('div[role="button"]');
    if (!infoContainer) throw new Error('Could not find contact info in header');

    // Name
    // Usually the first span with dir="auto" or similar
    // Let's try a heuristic approach
    let name = '';
    const titleSpan = infoContainer.querySelector('span[dir="auto"]');
    if (titleSpan) {
        name = titleSpan.innerText;
    }

    // Phone Number
    // Often the same as name if not saved, or we can try to find it in the "click to info" area
    // For now, let's just grab the name. Phone extraction from header is tricky if contact is saved.
    // Best bet: Use the name. The user can edit later in CRM.

    // Profile Pic
    let avatar = '';
    const img = header.querySelector('img');
    if (img) {
        avatar = img.src;
    }

    return {
        name: name,
        phone: '', // Hard to get from header reliably if saved as contact name
        avatar: avatar,
        timestamp: new Date().toISOString()
    };
}
