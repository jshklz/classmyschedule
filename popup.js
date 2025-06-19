document.addEventListener("DOMContentLoaded", () => {
  const usageBox = document.getElementById("usageBox");
  const toggleBtn = document.getElementById("toggleUsageBtn");
  const progress = document.getElementById("progress");

  toggleBtn.addEventListener("click", () => {
    usageBox.classList.toggle("hidden");
    toggleBtn.textContent = usageBox.classList.contains("hidden") ? "Show Usage" : "Collapse Usage";
  });

  document.getElementById("fall").addEventListener("click", () => {
    const start = document.getElementById("fallStart").value;
    const end = document.getElementById("fallEnd").value;
    exportTerm("fall", start, end);
  });

  document.getElementById("winter").addEventListener("click", () => {
    const start = document.getElementById("winterStart").value;
    const end = document.getElementById("winterEnd").value;
    exportTerm("winter", start, end);
  });

  function exportTerm(term, startDate, endDate) {
    if (!startDate || !endDate) {
      alert(`Enter both start and end dates for the ${term} term.`);
      return;
    }

    progress.classList.remove("hidden");

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs.length) {
        progress.classList.add("hidden");
        alert("Refresh the page. Something went wrong.");
        return;
      }

      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: term, startDate, endDate },
        (response) => {
          progress.classList.add("hidden");
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError.message);
            alert("Could not export for some reason (check dates). Are you on the site DraftMySchedule? Refresh if you are.");
          } 
        }
      );
    });
  }
});
