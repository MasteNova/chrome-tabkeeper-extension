// ============================================
// TABKEEPER PRO - COMPLETE POPUP SCRIPT
// ============================================

let closedTabsData = [];
let currentFilter = "all"; // all, pinned, today, week
let searchTerm = "";

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatTime(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return `${seconds} sec ago`;
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} min ago`;
  }
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  }
  const days = Math.floor(seconds / 86400);
  return `${days} day${days !== 1 ? "s" : ""} ago`;
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

function isToday(timestamp) {
  const today = new Date().toDateString();
  const date = new Date(timestamp).toDateString();
  return today === date;
}

function isThisWeek(timestamp) {
  const now = new Date();
  const date = new Date(timestamp);
  const oneWeekAgo = new Date(now.setDate(now.getDate() - 7));
  return date >= oneWeekAgo;
}

// ============================================
// DISPLAY TABS
// ============================================

function displayTabs() {
  const tabsListDiv = document.getElementById("tabsList");
  const tabCountSpan = document.getElementById("tabCount");
  const pinnedCountSpan = document.getElementById("pinnedCount");

  let filteredTabs = [...closedTabsData];

  // Apply filters
  if (currentFilter === "pinned") {
    filteredTabs = filteredTabs.filter((tab) => tab.isPinned === true);
  } else if (currentFilter === "today") {
    filteredTabs = filteredTabs.filter((tab) => isToday(tab.closedAt));
  } else if (currentFilter === "week") {
    filteredTabs = filteredTabs.filter((tab) => isThisWeek(tab.closedAt));
  }

  // Apply search
  if (searchTerm && searchTerm.trim() !== "") {
    const term = searchTerm.toLowerCase();
    filteredTabs = filteredTabs.filter(
      (tab) =>
        tab.title.toLowerCase().includes(term) ||
        tab.url.toLowerCase().includes(term),
    );
  }

  // Update counts
  const pinnedCount = closedTabsData.filter((t) => t.isPinned).length;
  tabCountSpan.textContent = filteredTabs.length;
  pinnedCountSpan.textContent = `📌 ${pinnedCount}`;

  // Empty state
  if (filteredTabs.length === 0) {
    let message = "✨ No closed tabs found";
    if (currentFilter === "pinned")
      message = "📌 No pinned tabs. Click 📌 on any tab to pin it!";
    if (currentFilter === "today") message = "📅 No tabs closed today";
    if (currentFilter === "week") message = "🗓️ No tabs closed this week";
    if (searchTerm) message = `🔍 No results for "${searchTerm}"`;

    tabsListDiv.innerHTML = `<div class="empty-state">${message}</div>`;
    return;
  }

  // Generate HTML
  tabsListDiv.innerHTML = filteredTabs
    .map(
      (tab) => `
    <div class="tab-item ${tab.isPinned ? "pinned" : ""}" data-url="${escapeHtml(tab.url)}" data-tab-id="${tab.id}">
      <img class="favicon" src="${escapeHtml(tab.favicon)}" onerror="this.src='https://www.google.com/s2/favicons?domain=google.com'">
      <div class="tab-info">
        <div class="tab-title" title="${escapeHtml(tab.title)}">
          ${tab.isPinned ? "📌 " : ""}${escapeHtml(tab.title)}
        </div>
        <div class="tab-url">${escapeHtml(tab.url)}</div>
        <div class="tab-time">⏱️ ${formatTime(tab.closedAt)}</div>
      </div>
      <div class="tab-actions">
        <button class="pin-btn" data-tab-id="${tab.id}" data-url="${escapeHtml(tab.url)}" title="${tab.isPinned ? "Unpin" : "Pin"}">
          ${tab.isPinned ? "📌" : "📍"}
        </button>
        <button class="restore-btn" data-url="${escapeHtml(tab.url)}" title="Restore">↩️</button>
      </div>
    </div>
  `,
    )
    .join("");

  // Add event listeners
  document.querySelectorAll(".restore-btn").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      restoreTab(btn.getAttribute("data-url"));
    });
  });

  document.querySelectorAll(".pin-btn").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      togglePinTab(
        btn.getAttribute("data-tab-id"),
        btn.getAttribute("data-url"),
      );
    });
  });

  document.querySelectorAll(".tab-item").forEach((item) => {
    item.addEventListener("click", (event) => {
      if (event.target.classList.contains("restore-btn")) return;
      if (event.target.classList.contains("pin-btn")) return;
      restoreTab(item.getAttribute("data-url"));
    });
  });
}

// ============================================
// CORE FUNCTIONS
// ============================================

function restoreTab(url) {
  chrome.tabs.create({ url: url, active: true });

  const index = closedTabsData.findIndex((tab) => tab.url === url);
  if (index !== -1) {
    closedTabsData.splice(index, 1);
    chrome.storage.local.set({ closedTabs: closedTabsData });
    displayTabs();
  }
}

function togglePinTab(tabId, tabUrl) {
  const tabIndex = closedTabsData.findIndex(
    (tab) => tab.id == tabId || tab.url === tabUrl,
  );

  if (tabIndex !== -1) {
    closedTabsData[tabIndex].isPinned = !closedTabsData[tabIndex].isPinned;
    chrome.storage.local.set({ closedTabs: closedTabsData });
    displayTabs();
  }
}

// ============================================
// FILTER FUNCTIONS
// ============================================

function setFilter(filter) {
  currentFilter = filter;

  // Update button styles
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.classList.remove("active");
  });

  if (filter === "pinned")
    document.getElementById("pinFilterBtn")?.classList.add("active");
  if (filter === "today")
    document.getElementById("todayFilterBtn")?.classList.add("active");
  if (filter === "week")
    document.getElementById("weekFilterBtn")?.classList.add("active");

  displayTabs();
}

function clearFilters() {
  currentFilter = "all";
  searchTerm = "";
  document.getElementById("searchInput").value = "";
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.classList.remove("active");
  });
  displayTabs();
}

// ============================================
// EXPORT/IMPORT
// ============================================

function exportTabs() {
  if (closedTabsData.length === 0) {
    alert("📭 No tabs to export!");
    return;
  }

  const exportData = {
    exportDate: new Date().toISOString(),
    version: "3.0",
    totalTabs: closedTabsData.length,
    tabs: closedTabsData,
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tabkeeper-backup-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  alert(`✅ Exported ${closedTabsData.length} tabs!`);
}

function importTabs() {
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".json";

  fileInput.onchange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        let tabsToImport =
          imported.tabs || (Array.isArray(imported) ? imported : []);

        const validTabs = tabsToImport
          .filter((tab) => tab.url && tab.title)
          .map((tab) => ({
            ...tab,
            id: Date.now() + Math.random(),
            importedAt: Date.now(),
          }));

        if (validTabs.length === 0) throw new Error("No valid tabs");

        closedTabsData = [...validTabs, ...closedTabsData];

        // Limit
        const maxTabs = 50;
        if (closedTabsData.length > maxTabs) {
          closedTabsData = closedTabsData.slice(0, maxTabs);
        }

        chrome.storage.local.set({ closedTabs: closedTabsData });
        displayTabs();
        alert(`✅ Imported ${validTabs.length} tabs!`);
      } catch (error) {
        alert("❌ Invalid file. Please export a valid TabKeeper backup.");
      }
    };
    reader.readAsText(file);
  };

  fileInput.click();
}

function clearAllTabs() {
  if (
    confirm(
      "⚠️ Delete ALL closed tabs? Pinned tabs will also be deleted. This cannot be undone.",
    )
  ) {
    closedTabsData = [];
    chrome.storage.local.set({ closedTabs: [] });
    displayTabs();
    alert("✅ All tabs cleared!");
  }
}

function showStats() {
  const total = closedTabsData.length;
  const pinned = closedTabsData.filter((t) => t.isPinned).length;
  const today = closedTabsData.filter((t) => isToday(t.closedAt)).length;
  const week = closedTabsData.filter((t) => isThisWeek(t.closedAt)).length;

  alert(
    `📊 TabKeeper Statistics\n\n` +
      `📋 Total saved: ${total}\n` +
      `📌 Pinned: ${pinned}\n` +
      `📅 Closed today: ${today}\n` +
      `🗓️ Closed this week: ${week}\n\n` +
      `💡 Tip: Press Ctrl+Shift+Y to restore last tab!`,
  );
}

// ============================================
// LOAD DATA & INIT
// ============================================

function loadData() {
  chrome.storage.local.get(["closedTabs"], (result) => {
    if (result.closedTabs && Array.isArray(result.closedTabs)) {
      closedTabsData = result.closedTabs;
      console.log("Loaded", closedTabsData.length, "tabs");
    } else {
      closedTabsData = [];
    }
    displayTabs();
  });
}

// ============================================
// EVENT LISTENERS
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  loadData();

  // Buttons
  document.getElementById("exportBtn")?.addEventListener("click", exportTabs);
  document.getElementById("importBtn")?.addEventListener("click", importTabs);
  document
    .getElementById("clearAllBtn")
    ?.addEventListener("click", clearAllTabs);
  document.getElementById("statsBtn")?.addEventListener("click", showStats);
  document.getElementById("settingsBtn")?.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
  document.getElementById("refreshBtn")?.addEventListener("click", () => {
    loadData();
  });

  // Filters
  document
    .getElementById("pinFilterBtn")
    ?.addEventListener("click", () => setFilter("pinned"));
  document
    .getElementById("todayFilterBtn")
    ?.addEventListener("click", () => setFilter("today"));
  document
    .getElementById("weekFilterBtn")
    ?.addEventListener("click", () => setFilter("week"));
  document
    .getElementById("clearFiltersBtn")
    ?.addEventListener("click", clearFilters);

  // Search
  document.getElementById("searchInput")?.addEventListener("input", (e) => {
    searchTerm = e.target.value;
    displayTabs();
  });
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (changes.closedTabs) {
    closedTabsData = changes.closedTabs.newValue || [];
    displayTabs();
  }
});
