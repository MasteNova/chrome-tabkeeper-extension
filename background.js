// TabKeeper Background - WORKING VERSION
// This saves tabs when they close

let closedTabsList = [];

// Load saved tabs when extension starts
chrome.storage.local.get(["closedTabsList"], (result) => {
  if (result.closedTabsList) {
    closedTabsList = result.closedTabsList;
    console.log("Loaded", closedTabsList.length, "saved tabs");
  }
});

// Save to storage
function saveToStorage() {
  chrome.storage.local.set({ closedTabsList: closedTabsList });
  console.log("Saved", closedTabsList.length, "tabs");
}

// ============================================
// METHOD 1: Use webNavigation to capture pages
// ============================================

// Store page info when a page finishes loading
chrome.webNavigation.onCompleted.addListener((details) => {
  // Only track main frame (not iframes)
  if (details.frameId === 0) {
    // Get the tab info
    chrome.tabs.get(details.tabId, (tab) => {
      if (tab && tab.url && tab.url.startsWith("http")) {
        // Store in a Map with tabId as key
        chrome.storage.local.set(
          {
            [`page_${details.tabId}`]: {
              url: tab.url,
              title: tab.title,
              favicon: tab.favIconUrl || "",
              timestamp: Date.now(),
            },
          },
          () => {
            console.log(
              "📄 Stored page info for tab",
              details.tabId,
              tab.title,
            );
          },
        );
      }
    });
  }
});

// When a tab is removed (closed)
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  console.log("❌ Tab closed:", tabId);

  // Get the stored page info for this tab
  chrome.storage.local.get([`page_${tabId}`], (result) => {
    const pageInfo = result[`page_${tabId}`];

    if (pageInfo && pageInfo.url) {
      // Create closed tab record
      const closedTab = {
        id: Date.now(),
        url: pageInfo.url,
        title: pageInfo.title || "Unknown",
        favicon: pageInfo.favicon,
        closedAt: Date.now(),
      };

      // Add to list
      closedTabsList.unshift(closedTab);

      // Keep only last 25
      if (closedTabsList.length > 25) {
        closedTabsList = closedTabsList.slice(0, 25);
      }

      // Save to storage
      saveToStorage();

      // Clean up stored page info
      chrome.storage.local.remove(`page_${tabId}`);

      console.log("✅ SAVED:", pageInfo.title);
    } else {
      console.log("⚠️ No page info found for tab", tabId);

      // FALLBACK: Try to get from last active tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].url) {
          console.log("🔄 Fallback: Using current tab info");
        }
      });
    }
  });
});

// ============================================
// Also capture when tabs update (navigation)
// ============================================
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.title) {
    if (tab.url && tab.url.startsWith("http")) {
      chrome.storage.local.set(
        {
          [`page_${tabId}`]: {
            url: tab.url,
            title: tab.title,
            favicon: tab.favIconUrl || "",
            timestamp: Date.now(),
          },
        },
        () => {
          console.log("🔄 Updated page info for tab", tabId);
        },
      );
    }
  }
});

// Also capture when tabs are created
chrome.tabs.onCreated.addListener((tab) => {
  console.log("📑 Tab created:", tab.id);
});

console.log("🚀 TabKeeper background loaded with webNavigation!");
