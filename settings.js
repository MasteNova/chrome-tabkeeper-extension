// TabKeeper Settings Script

function showStatus(message, isError = false) {
  const statusDiv = document.getElementById("statusMessage");
  statusDiv.textContent = message;
  statusDiv.className = isError ? "status error" : "status success";

  setTimeout(() => {
    statusDiv.className = "status";
  }, 3000);
}

function loadSettings() {
  chrome.storage.local.get(["settings"], (result) => {
    const settings = result.settings || {
      theme: "light",
      maxTabs: 50,
      cleanupDays: 7,
    };

    document.getElementById("themeSelect").value = settings.theme;
    document.getElementById("maxTabsInput").value = settings.maxTabs;
    document.getElementById("cleanupDaysInput").value = settings.cleanupDays;
  });
}

function saveSettings() {
  const theme = document.getElementById("themeSelect").value;
  const maxTabs = parseInt(document.getElementById("maxTabsInput").value);
  const cleanupDays = parseInt(
    document.getElementById("cleanupDaysInput").value,
  );

  // Validate
  if (maxTabs < 10 || maxTabs > 100) {
    showStatus("❌ Max tabs must be between 10 and 100", true);
    return;
  }

  if (cleanupDays < 1 || cleanupDays > 30) {
    showStatus("❌ Cleanup days must be between 1 and 30", true);
    return;
  }

  const settings = { theme, maxTabs, cleanupDays };

  chrome.storage.local.set({ settings }, () => {
    showStatus("✅ Settings saved successfully!");

    // Notify background script
    chrome.runtime.sendMessage({
      type: "UPDATE_SETTINGS",
      settings: settings,
    });
  });
}

function resetSettings() {
  if (confirm("Reset all settings to default?")) {
    const defaultSettings = {
      theme: "light",
      maxTabs: 50,
      cleanupDays: 7,
    };

    chrome.storage.local.set({ settings: defaultSettings }, () => {
      document.getElementById("themeSelect").value = "light";
      document.getElementById("maxTabsInput").value = 50;
      document.getElementById("cleanupDaysInput").value = 7;
      showStatus("✅ Reset to default settings!");

      chrome.runtime.sendMessage({
        type: "UPDATE_SETTINGS",
        settings: defaultSettings,
      });
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadSettings();
  document.getElementById("saveBtn").addEventListener("click", saveSettings);
  document.getElementById("resetBtn").addEventListener("click", resetSettings);
});
