// Load and display closed tabs
let closedTabsData = [];

function formatTime(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return `${seconds} seconds ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

function displayTabs(searchTerm = "") {
  const tabsList = document.getElementById("tabsList");
  const tabCountSpan = document.getElementById("tabCount");

  let filteredTabs = closedTabsData;
  if (searchTerm) {
    filteredTabs = closedTabsData.filter(
      (tab) =>
        tab.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tab.url.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }

  tabCountSpan.textContent = filteredTabs.length;

  if (filteredTabs.length === 0) {
    tabsList.innerHTML =
      '<div class="empty-state">📭 No closed tabs found</div>';
    return;
  }

  tabsList.innerHTML = filteredTabs
    .map(
      (tab) => `
    <div class="tab-item" data-url="${tab.url}">
      <img class="favicon" src="${tab.favicon}" onerror="this.src='https://www.google.com/s2/favicons?domain=google.com'">
      <div class="tab-info">
        <div class="tab-title">${escapeHtml(tab.title)}</div>
        <div class="tab-url">${escapeHtml(tab.url)}</div>
        <div class="tab-time">⏱️ ${formatTime(tab.closedAt)}</div>
      </div>
      <button class="restore-btn" data-url="${tab.url}">↩️</button>
    </div>
  `,
    )
    .join("");

  // Add click listeners to restore buttons
  document.querySelectorAll(".restore-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const url = btn.getAttribute("data-url");
      restoreTab(url);
    });
  });

  // Add click listeners to tab items (click anywhere to restore)
  document.querySelectorAll(".tab-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      if (e.target.classList.contains("restore-btn")) return;
      const url = item.getAttribute("data-url");
      restoreTab(url);
    });
  });
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function restoreTab(url) {
  chrome.tabs.create({ url: url, active: true });

  // Remove from list after restore
  const index = closedTabsData.findIndex((tab) => tab.url === url);
  if (index !== -1) {
    closedTabsData.splice(index, 1);
    chrome.storage.local.set({ closedTabs: closedTabsData });
    displayTabs(document.getElementById("searchInput").value);
  }
}

function clearAllTabs() {
  if (confirm("Delete all closed tabs history?")) {
    closedTabsData = [];
    chrome.storage.local.set({ closedTabs: [] });
    displayTabs();
  }
}

// Load data from storage
function loadData() {
  chrome.storage.local.get(["closedTabs"], (result) => {
    if (result.closedTabs && Array.isArray(result.closedTabs)) {
      closedTabsData = result.closedTabs;
    } else {
      closedTabsData = [];
    }
    displayTabs();
  });
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
  loadData();

  document
    .getElementById("clearAllBtn")
    .addEventListener("click", clearAllTabs);
  document.getElementById("settingsBtn").addEventListener("click", () => {
    // Future settings page
    alert("Settings coming soon!");
  });

  document.getElementById("searchInput").addEventListener("input", (e) => {
    displayTabs(e.target.value);
  });
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (changes.closedTabs) {
    closedTabsData = changes.closedTabs.newValue || [];
    displayTabs(document.getElementById("searchInput").value);
  }
});
