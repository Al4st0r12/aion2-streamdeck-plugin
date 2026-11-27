(() => {
  const panel = document.querySelector("[data-update-check]");
  if (!panel) return;

  const currentVersion = panel.dataset.currentVersion;
  const message = panel.querySelector("[data-update-message]");
  const link = panel.querySelector("[data-update-link]");
  const releaseUrl = "https://github.com/Al4st0r12/aion2-streamdeck-plugin/releases/latest";
  const apiUrl = "https://api.github.com/repos/Al4st0r12/aion2-streamdeck-plugin/releases/latest";
  const cacheKey = `aion2-stats-release-check-${currentVersion}`;
  const cacheLifetime = 30 * 60 * 1000;

  function versionParts(value) {
    const normalized = String(value || "").replace(/^v/i, "");
    if (!/^\d+(?:\.\d+)*$/.test(normalized)) return null;
    return normalized.split(".").map((part) => Number(part));
  }

  function compareVersions(left, right) {
    const a = versionParts(left);
    const b = versionParts(right);
    if (!a || !b) return null;
    const length = Math.max(a.length, b.length);
    for (let index = 0; index < length; index += 1) {
      const difference = (a[index] || 0) - (b[index] || 0);
      if (difference !== 0) return Math.sign(difference);
    }
    return 0;
  }

  function render(latestTag) {
    const latestVersion = String(latestTag || "").replace(/^v/i, "");
    const comparison = compareVersions(latestVersion, currentVersion);
    if (comparison === null) throw new Error("Ungültige Versionsnummer");

    link.href = releaseUrl;
    if (comparison > 0) {
      panel.dataset.state = "available";
      message.textContent = `Update verfügbar: v${latestVersion}. Öffne den Release und installiere die Datei per Doppelklick.`;
      link.textContent = `v${latestVersion} herunterladen`;
    } else {
      panel.dataset.state = "current";
      message.textContent = `Du verwendest die aktuelle Version v${currentVersion}.`;
      link.textContent = "Alle GitHub-Releases ansehen";
    }
  }

  function showUnavailable() {
    panel.dataset.state = "error";
    message.textContent = "Updateprüfung nicht erreichbar. Du kannst die Releases auf GitHub ansehen.";
    link.href = releaseUrl;
    link.textContent = "GitHub-Releases öffnen";
  }

  async function checkForUpdates() {
    try {
      const cached = JSON.parse(window.localStorage.getItem(cacheKey) || "null");
      if (cached && Date.now() - cached.checkedAt < cacheLifetime) {
        render(cached.latestTag);
        return;
      }
    } catch {
      // Continue with a fresh request if the WebView blocks local storage.
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(apiUrl, {
        headers: { Accept: "application/vnd.github+json" },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`GitHub API HTTP ${response.status}`);
      const release = await response.json();
      if (!release.tag_name) throw new Error("Release-Version fehlt");
      render(release.tag_name);
      try {
        window.localStorage.setItem(cacheKey, JSON.stringify({ latestTag: release.tag_name, checkedAt: Date.now() }));
      } catch {
        // The version result is still useful when caching is unavailable.
      }
    } catch {
      showUnavailable();
    } finally {
      window.clearTimeout(timeout);
    }
  }

  checkForUpdates();
})();

