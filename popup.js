// ============================================
// TABKEEPER POPUP SCRIPT
// ============================================
// This runs when user clicks the extension icon
// It displays closed tabs and handles restore/clicks
// ============================================

// Global variable to store closed tabs data
let closedTabsData = [];

// ============================================
// HELPER: Format time (e.g., "5 minutes ago")
// ============================================

function formatTime(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return `${seconds} second${seconds !== 1 ? "s" : ""} ago`;
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  }
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  }
  const days = Math.floor(seconds / 86400);
  return `${days} day${days !== 1 ? "s" : ""} ago`;
}

// ============================================
// HELPER: Escape HTML to prevent XSS attacks
// ============================================

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ============================================
// MAIN: Display tabs in popup
// ============================================

function displayTabs(searchTerm = "") {
  const tabsListDiv = document.getElementById("tabsList");
  const tabCountSpan = document.getElementById("tabCount");

  // Filter tabs by search term if provided
  let filteredTabs = closedTabsData;
  if (searchTerm && searchTerm.trim() !== "") {
    const term = searchTerm.toLowerCase();
    filteredTabs = closedTabsData.filter(
      (tab) =>
        tab.title.toLowerCase().includes(term) ||
        tab.url.toLowerCase().includes(term),
    );
  }

  // Update count in footer
  tabCountSpan.textContent = filteredTabs.length;

  // Show empty state if no tabs
  if (filteredTabs.length === 0) {
    if (closedTabsData.length === 0) {
      tabsListDiv.innerHTML =
        '<div class="empty-state">📭 No closed tabs yet. Close a tab to see it here!</div>';
    } else {
      tabsListDiv.innerHTML =
        '<div class="empty-state">🔍 No matching tabs found</div>';
    }
    return;
  }

  // Generate HTML for each tab
  tabsListDiv.innerHTML = filteredTabs
    .map(
      (tab) => `
    <div class="tab-item" data-url="${escapeHtml(tab.url)}" data-tab-id="${tab.id}">
      <img class="favicon" src="${escapeHtml(tab.favicon)}" onerror="this.src='https://www.google.com/s2/favicons?domain=google.com'">
      <div class="tab-info">
        <div class="tab-title">${escapeHtml(tab.title)}</div>
        <div class="tab-url">${escapeHtml(tab.url)}</div>
        <div class="tab-time">⏱️ ${formatTime(tab.closedAt)}</div>
      </div>
      <button class="restore-btn" data-url="${escapeHtml(tab.url)}">↩️ Restore</button>
    </div>
  `,
    )
    .join("");

  // Add click listeners to all restore buttons
  document.querySelectorAll(".restore-btn").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation(); // Prevent triggering the parent tab-item click
      const url = btn.getAttribute("data-url");
      restoreTab(url);
    });
  });

  // Add click listeners to entire tab items (click anywhere to restore)
  document.querySelectorAll(".tab-item").forEach((item) => {
    item.addEventListener("click", (event) => {
      // Don't trigger if clicking the restore button (already handled)
      if (event.target.classList.contains("restore-btn")) return;
      const url = item.getAttribute("data-url");
      restoreTab(url);
    });
  });
}

// ============================================
// FUNCTION: Restore a closed tab
// ============================================

function restoreTab(url) {
  console.log("Restoring tab:", url);

  // Create a new tab with the same URL
  chrome.tabs.create({ url: url, active: true });

  // Remove from our data
  const index = closedTabsData.findIndex((tab) => tab.url === url);
  if (index !== -1) {
    closedTabsData.splice(index, 1);
    // Save updated list to storage
    chrome.storage.local.set({ closedTabs: closedTabsData });
    // Refresh display
    const searchInput = document.getElementById("searchInput");
    displayTabs(searchInput.value);
  }
}

// ============================================
// FUNCTION: Clear all closed tabs
// ============================================

function clearAllTabs() {
  if (
    confirm(
      "Are you sure? This will permanently delete all closed tabs from history.",
    )
  ) {
    closedTabsData = [];
    chrome.storage.local.set({ closedTabs: [] });
    displayTabs();
    console.log("Cleared all closed tabs");
  }
}

// ============================================
// FUNCTION: Load data from storage
// ============================================

function loadData() {
  chrome.storage.local.get(["closedTabs"], (result) => {
    console.log("Loaded data from storage:", result);

    if (result.closedTabs && Array.isArray(result.closedTabs)) {
      closedTabsData = result.closedTabs;
    } else {
      closedTabsData = [];
    }

    displayTabs();
  });
}

// ============================================
// EVENT LISTENERS (runs when popup opens)
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  console.log("Popup opened, loading data...");
  loadData();

  // Clear all button
  const clearBtn = document.getElementById("clearAllBtn");
  if (clearBtn) {
    clearBtn.addEventListener("click", clearAllTabs);
  }

  // Settings button (future feature)
  const settingsBtn = document.getElementById("settingsBtn");
  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
      // TODO: Open settings page
      alert(
        "⚙️ Settings page coming soon!\n\nFeatures planned:\n• Max tabs to save\n• Auto-cleanup days\n• Dark mode",
      );
    });
  }

  // Search input
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      displayTabs(event.target.value);
    });
  }
});

// ============================================
// LISTEN FOR STORAGE CHANGES (updates in real-time)
// ============================================

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (changes.closedTabs) {
    console.log("Storage changed, updating display...");
    closedTabsData = changes.closedTabs.newValue || [];
    const searchInput = document.getElementById("searchInput");
    displayTabs(searchInput ? searchInput.value : "");
  }
});
