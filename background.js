// Maximum number of closed tabs to store
const MAX_CLOSED_TABS = 25;

// Store closed tabs
let closedTabsList = [];

// Load saved data when extension starts
chrome.storage.local.get(["closedTabs"], (result) => {
  if (result.closedTabs && Array.isArray(result.closedTabs)) {
    closedTabsList = result.closedTabs;
  }
});

// Function to save to storage
function saveToStorage() {
  chrome.storage.local.set({ closedTabs: closedTabsList });
}

// Listen for tab removal
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  // We need tab info before closing - challenge
  // Workaround: Use chrome.tabs.get with delay (tab might not exist)
  // Better solution: Use webNavigation or capture tab info on creation
  console.log("Tab closed:", tabId);
});

// ACTUAL WORKING SOLUTION: Track tabs on creation
let activeTabs = new Map();

// Store tab info when created
chrome.tabs.onCreated.addListener((tab) => {
  if (tab.id && tab.url && !tab.url.startsWith("chrome://")) {
    activeTabs.set(tab.id, {
      url: tab.url,
      title: tab.title || "New Tab",
      favicon: tab.favIconUrl || "",
    });
  }
});

// Update info when tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.url && !tab.url.startsWith("chrome://")) {
    activeTabs.set(tabId, {
      url: tab.url,
      title: tab.title || "Loading...",
      favicon: tab.favIconUrl || "",
    });
  }
});

// When tab closes, save it
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if (activeTabs.has(tabId)) {
    const tabInfo = activeTabs.get(tabId);

    // Add to closed tabs list
    closedTabsList.unshift({
      id: Date.now(),
      url: tabInfo.url,
      title: tabInfo.title,
      favicon:
        tabInfo.favicon ||
        "https://www.google.com/s2/favicons?domain=" +
          new URL(tabInfo.url).hostname,
      closedAt: Date.now(),
    });

    // Keep only last MAX_CLOSED_TABS
    if (closedTabsList.length > MAX_CLOSED_TABS) {
      closedTabsList = closedTabsList.slice(0, MAX_CLOSED_TABS);
    }

    // Save to storage
    saveToStorage();

    // Remove from active tabs
    activeTabs.delete(tabId);
  }
});

// Keyboard shortcut handler
chrome.commands.onCommand.addListener((command) => {
  if (command === "restore-last-tab" && closedTabsList.length > 0) {
    const lastTab = closedTabsList[0];
    chrome.tabs.create({ url: lastTab.url, active: true });

    // Remove from list after restore
    closedTabsList.shift();
    saveToStorage();
  }
});

// Optional: Clear old tabs after 7 days
setInterval(
  () => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const filtered = closedTabsList.filter(
      (tab) => tab.closedAt > sevenDaysAgo,
    );
    if (filtered.length !== closedTabsList.length) {
      closedTabsList = filtered;
      saveToStorage();
    }
  },
  24 * 60 * 60 * 1000,
); // Run once per day
