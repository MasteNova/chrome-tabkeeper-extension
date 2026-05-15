// ============================================
// TABKEEPER BACKGROUND SCRIPT
// ============================================
// This runs constantly in the background
// It listens for tab closes and saves them
// ============================================

// Maximum number of closed tabs to store
const MAX_CLOSED_TABS = 25;

// Array to store closed tabs in memory
let closedTabsList = [];

// ============================================
// LOAD SAVED DATA WHEN EXTENSION STARTS
// ============================================
// chrome.storage.local is like localStorage but for extensions
// It persists even after browser restart

chrome.storage.local.get(["closedTabs"], (result) => {
  if (result.closedTabs && Array.isArray(result.closedTabs)) {
    closedTabsList = result.closedTabs;
    console.log("Loaded", closedTabsList.length, "saved tabs");
  }
});

// ============================================
// SAVE TO STORAGE HELPER FUNCTION
// ============================================

function saveToStorage() {
  chrome.storage.local.set({ closedTabs: closedTabsList });
  console.log("Saved", closedTabsList.length, "tabs to storage");
}

// ============================================
// TRACK TABS WHEN CREATED
// ============================================
// We need to store tab info BEFORE they close
// Because when a tab closes, we lose its URL/title

let activeTabs = new Map(); // Map stores key-value pairs (tabId -> tabInfo)

// Listen for new tabs being created
chrome.tabs.onCreated.addListener((tab) => {
  // Only track valid web pages (ignore chrome:// pages)
  if (tab.id && tab.url && !tab.url.startsWith("chrome://")) {
    activeTabs.set(tab.id, {
      url: tab.url,
      title: tab.title || "New Tab",
      favicon: tab.favIconUrl || "",
    });
    console.log("Tracking new tab:", tab.title);
  }
});

// Listen for tab updates (page navigates, title changes, etc.)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Update our stored info when tab changes
  if (tab.url && !tab.url.startsWith("chrome://")) {
    activeTabs.set(tabId, {
      url: tab.url,
      title: tab.title || "Loading...",
      favicon: tab.favIconUrl || "",
    });
    console.log("Updated tab info:", tab.title);
  }
});

// ============================================
// MAIN EVENT: WHEN TAB CLOSES
// ============================================

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  console.log("Tab closed, ID:", tabId);

  // Check if we were tracking this tab
  if (activeTabs.has(tabId)) {
    const tabInfo = activeTabs.get(tabId);

    // Create a record of the closed tab
    const closedTab = {
      id: Date.now(), // Unique ID using current timestamp
      url: tabInfo.url,
      title: tabInfo.title,
      favicon: tabInfo.favicon,
      closedAt: Date.now(), // When it was closed
    };

    // Add to the BEGINNING of the array (most recent first)
    closedTabsList.unshift(closedTab);

    // Keep only the most recent MAX_CLOSED_TABS
    if (closedTabsList.length > MAX_CLOSED_TABS) {
      closedTabsList = closedTabsList.slice(0, MAX_CLOSED_TABS);
    }

    // Save to permanent storage
    saveToStorage();

    // Remove from active tracking
    activeTabs.delete(tabId);

    console.log("Saved closed tab:", tabInfo.title);
  } else {
    console.log("Tab wasn't being tracked (probably chrome:// page)");
  }
});

// ============================================
// KEYBOARD SHORTCUT HANDLER
// ============================================
// When user presses Ctrl+Shift+Y (or Cmd+Shift+Y on Mac)

chrome.commands.onCommand.addListener((command) => {
  if (command === "restore-last-tab" && closedTabsList.length > 0) {
    const lastTab = closedTabsList[0];
    console.log("Restoring last tab:", lastTab.title);

    // Create a new tab with the same URL
    chrome.tabs.create({ url: lastTab.url, active: true });

    // Remove from list after restore
    closedTabsList.shift();
    saveToStorage();
  }
});

// ============================================
// AUTO-CLEANUP OLD TABS (7 days)
// ============================================
// Runs once per day to delete tabs older than 7 days

setInterval(
  () => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const originalCount = closedTabsList.length;

    const filtered = closedTabsList.filter(
      (tab) => tab.closedAt > sevenDaysAgo,
    );

    if (filtered.length !== originalCount) {
      closedTabsList = filtered;
      saveToStorage();
      console.log(
        "Cleaned up old tabs. Removed:",
        originalCount - filtered.length,
      );
    }
  },
  24 * 60 * 60 * 1000,
); // 24 hours in milliseconds

console.log("TabKeeper background script loaded!");
