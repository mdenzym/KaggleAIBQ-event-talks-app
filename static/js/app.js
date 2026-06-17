// BigQuery Release Pulse - Frontend Application Logic

// Application State
let releaseNotes = [];
let selectedUpdateId = null;
const feedUrl = "/api/notes";

// DOM Elements
const refreshBtn = document.getElementById("refresh-btn");
const statusBadge = document.getElementById("status-badge");
const statusText = document.getElementById("status-text");
const searchInput = document.getElementById("search-input");
const filterCheckboxes = document.querySelectorAll('#filter-types input[type="checkbox"]');
const skeletonLoader = document.getElementById("skeleton-loader");
const actualFeed = document.getElementById("actual-feed");
const emptyState = document.getElementById("empty-state");

// Composer Elements
const composerPlaceholder = document.getElementById("composer-placeholder");
const composerActive = document.getElementById("composer-active");
const tweetTextarea = document.getElementById("tweet-text");
const charCountSpan = document.getElementById("char-count");
const charProgress = document.getElementById("char-progress");
const xPreviewText = document.getElementById("x-preview-text-content");
const copyBtn = document.getElementById("copy-btn");
const tweetBtn = document.getElementById("tweet-btn");

// Theme and Customizer Elements
const themeToggleBtn = document.getElementById("theme-toggle-btn");
const themePresetsContainer = document.getElementById("theme-presets");
const moonIcon = themeToggleBtn.querySelector(".moon-icon");
const sunIcon = themeToggleBtn.querySelector(".sun-icon");

// Statistics Elements
const statTotalNotes = document.getElementById("stat-total-notes");
const statLastUpdated = document.getElementById("stat-last-updated");
const countBadges = {
    "Feature": document.getElementById("count-feature"),
    "Announcement": document.getElementById("count-announcement"),
    "Deprecation": document.getElementById("count-deprecation"),
    "Fix": document.getElementById("count-fix"),
    "General": document.getElementById("count-general")
};

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
    initializeTheme();
    fetchReleaseNotes(false);
    setupEventListeners();
});

function setupEventListeners() {
    // Refresh feed
    refreshBtn.addEventListener("click", () => fetchReleaseNotes(true));

    // Search and Filter changes
    searchInput.addEventListener("input", renderFeed);
    filterCheckboxes.forEach(cb => cb.addEventListener("change", renderFeed));

    // Tweet Composer Input Handler
    tweetTextarea.addEventListener("input", updateTweetComposerState);

    // Copy to Clipboard Action
    copyBtn.addEventListener("click", copyTweetToClipboard);

    // Tweet / X Post Web Intent Action
    tweetBtn.addEventListener("click", openTwitterShare);

    // Theme Customizer Actions
    themeToggleBtn.addEventListener("click", toggleTheme);
    
    const presetButtons = themePresetsContainer.querySelectorAll(".theme-preset-btn");
    presetButtons.forEach(btn => {
        btn.addEventListener("click", (e) => {
            const presetName = e.currentTarget.getAttribute("data-preset");
            applyPreset(presetName);
        });
    });
}

// Fetch notes from Flask backend API
async function fetchReleaseNotes(forceRefresh = false) {
    // Show loading state
    refreshBtn.classList.add("loading");
    refreshBtn.disabled = true;
    skeletonLoader.style.display = "block";
    actualFeed.style.display = "none";
    emptyState.style.display = "none";
    statusText.textContent = "Fetching...";
    statusBadge.style.opacity = 1;

    try {
        const url = forceRefresh ? `${feedUrl}?refresh=true` : feedUrl;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Server returned code ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.status === "error") {
            throw new Error(result.message);
        }
        
        // Cache success
        releaseNotes = result.notes || [];
        statusText.textContent = result.status === "warning" ? "Stale Data" : "Synced";
        
        // Update dashboard statistics
        updateStatistics();
        
        // Render notes
        renderFeed();
        
    } catch (error) {
        console.error("Error fetching release notes:", error);
        statusText.textContent = "Error";
        alert(`Failed to load release notes: ${error.message}`);
    } finally {
        refreshBtn.classList.remove("loading");
        refreshBtn.disabled = false;
        skeletonLoader.style.display = "none";
    }
}

// Parse HTML tags to extract clean plain text
function cleanHtmlText(html) {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    
    // Format anchor tags to just include text
    const anchors = tempDiv.querySelectorAll('a');
    anchors.forEach(a => {
        // Option: we can represent it as "Text (URL)" or just "Text"
        // Let's keep it clean as just "Text" to conserve character limits
        a.replaceWith(a.textContent);
    });
    
    return tempDiv.textContent || tempDiv.innerText || "";
}

// Compute counts and metadata
function updateStatistics() {
    let totalSubUpdates = 0;
    const typeCounts = { Feature: 0, Announcement: 0, Deprecation: 0, Fix: 0, General: 0 };
    
    releaseNotes.forEach(entry => {
        if (entry.updates && entry.updates.length > 0) {
            entry.updates.forEach(upd => {
                totalSubUpdates++;
                const category = upd.type || "General";
                if (typeCounts[category] !== undefined) {
                    typeCounts[category]++;
                } else {
                    typeCounts["General"]++;
                }
            });
        }
    });

    // Update stats UI
    statTotalNotes.textContent = totalSubUpdates;
    
    if (releaseNotes.length > 0) {
        statLastUpdated.textContent = releaseNotes[0].date;
    } else {
        statLastUpdated.textContent = "-";
    }

    // Update filter counts UI
    Object.keys(countBadges).forEach(cat => {
        if (countBadges[cat]) {
            countBadges[cat].textContent = typeCounts[cat];
        }
    });
}

// Get active filters from checkboxes
function getActiveFilters() {
    const active = [];
    filterCheckboxes.forEach(cb => {
        if (cb.checked) {
            active.push(cb.value);
        }
    });
    return active;
}

// Render the feed dynamically
function renderFeed() {
    const searchQuery = searchInput.value.toLowerCase().trim();
    const activeFilters = getActiveFilters();
    
    actualFeed.innerHTML = "";
    
    let renderedCount = 0;
    
    // Loop through each date group
    releaseNotes.forEach((entry, entryIndex) => {
        // Filter sub-updates
        const filteredSubUpdates = entry.updates.filter(upd => {
            const matchesType = activeFilters.includes(upd.type) || (upd.type === "General" && activeFilters.includes("General"));
            
            if (!matchesType) return false;
            
            if (searchQuery) {
                const typeMatch = upd.type.toLowerCase().includes(searchQuery);
                const dateMatch = entry.date.toLowerCase().includes(searchQuery);
                
                // Clean the HTML first to search in readable content
                const cleanContent = cleanHtmlText(upd.content).toLowerCase();
                const contentMatch = cleanContent.includes(searchQuery);
                
                return typeMatch || dateMatch || contentMatch;
            }
            
            return true;
        });
        
        if (filteredSubUpdates.length > 0) {
            // Create a Date group section
            const dateGroup = document.createElement("div");
            dateGroup.className = "date-group";
            
            const divider = document.createElement("div");
            divider.className = "date-divider";
            divider.textContent = entry.date;
            dateGroup.appendChild(divider);
            
            filteredSubUpdates.forEach((upd, updIndex) => {
                const uniqueId = `upd-${entryIndex}-${updIndex}`;
                renderedCount++;
                
                const card = document.createElement("div");
                card.className = "update-card";
                if (selectedUpdateId === uniqueId) {
                    card.classList.add("selected");
                }
                
                card.setAttribute("tabindex", "0");
                card.setAttribute("role", "button");
                card.setAttribute("aria-pressed", selectedUpdateId === uniqueId ? "true" : "false");
                
                // Get style category
                let categoryClass = "badge-general";
                const catLower = (upd.type || "").toLowerCase();
                if (catLower.includes("feature")) categoryClass = "badge-feature";
                else if (catLower.includes("announcement")) categoryClass = "badge-announcement";
                else if (catLower.includes("deprecation")) categoryClass = "badge-deprecation";
                else if (catLower.includes("fix")) categoryClass = "badge-fix";
                
                card.innerHTML = `
                    <div class="card-top">
                        <span class="badge ${categoryClass}">${upd.type}</span>
                        <div class="select-indicator">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                    </div>
                    <div class="card-content">${upd.content}</div>
                `;
                
                // Click to select
                card.addEventListener("click", () => handleCardSelection(uniqueId, entry.date, upd.type, upd.content));
                card.addEventListener("keydown", (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleCardSelection(uniqueId, entry.date, upd.type, upd.content);
                    }
                });
                
                dateGroup.appendChild(card);
            });
            
            actualFeed.appendChild(dateGroup);
        }
    });
    
    // Display control checks
    if (renderedCount > 0) {
        actualFeed.style.display = "block";
        emptyState.style.display = "none";
    } else {
        actualFeed.style.display = "none";
        emptyState.style.display = "flex";
    }
}

// Handle update selection
function handleCardSelection(uniqueId, date, type, htmlContent) {
    const previousSelected = document.querySelector(".update-card.selected");
    if (previousSelected) {
        previousSelected.classList.remove("selected");
        previousSelected.setAttribute("aria-pressed", "false");
    }
    
    if (selectedUpdateId === uniqueId) {
        // Toggle off
        selectedUpdateId = null;
        composerPlaceholder.style.display = "flex";
        composerActive.style.display = "none";
    } else {
        // Select new
        selectedUpdateId = uniqueId;
        
        // Find the new card element and highlight it
        // Note: Rather than relying on index lookup which might change with filters,
        // we re-render or selectively classList add. Rerendering keeps index state synced.
        renderFeed();
        
        // Populate composer
        composerPlaceholder.style.display = "none";
        composerActive.style.display = "flex";
        
        // Draft Tweet text
        const cleanText = cleanHtmlText(htmlContent).trim();
        const header = `BigQuery [${type}] (${date}): `;
        const linkUrl = "\n\nhttps://cloud.google.com/bigquery/docs/release-notes";
        
        // Truncate cleanText if it exceeds limits
        const maxTextLen = 280 - header.length - linkUrl.length;
        let finalBody = cleanText;
        if (cleanText.length > maxTextLen) {
            finalBody = cleanText.substring(0, maxTextLen - 3) + "...";
        }
        
        tweetTextarea.value = `${header}${finalBody}${linkUrl}`;
        updateTweetComposerState();
    }
}

// Update character counter and preview card
function updateTweetComposerState() {
    const text = tweetTextarea.value;
    const len = text.length;
    
    charCountSpan.textContent = `${len} / 280`;
    
    // Progress bar fill calculation
    const pct = Math.min((len / 280) * 100, 100);
    charProgress.style.width = `${pct}%`;
    
    // Color warnings
    charProgress.className = "char-progress-fill";
    if (len > 280) {
        charProgress.classList.add("danger");
        charCountSpan.style.color = "var(--badge-deprecation-text)";
        tweetBtn.disabled = true;
    } else if (len >= 240) {
        charProgress.classList.add("warning");
        charCountSpan.style.color = "var(--badge-fix-text)";
        tweetBtn.disabled = false;
    } else {
        charCountSpan.style.color = "var(--text-muted)";
        tweetBtn.disabled = len === 0;
    }
    
    // Preview Content Update
    xPreviewText.textContent = text || "Draft content will appear here...";
}

// Copy Tweet to clipboard
async function copyTweetToClipboard() {
    const text = tweetTextarea.value;
    if (!text) return;
    
    try {
        await navigator.clipboard.writeText(text);
        
        // Show copied feedback animation
        const originalIcon = copyBtn.innerHTML;
        copyBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        `;
        copyBtn.style.borderColor = "#34d399";
        
        setTimeout(() => {
            copyBtn.innerHTML = originalIcon;
            copyBtn.style.borderColor = "var(--border-color)";
        }, 1800);
        
    } catch (err) {
        console.error("Clipboard copy failed", err);
        alert("Failed to copy text. Please select it and copy manually.");
    }
}

// Open X/Twitter Intent
function openTwitterShare() {
    const text = tweetTextarea.value;
    if (!text || text.length > 280) return;
    
    const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(intentUrl, "_blank", "noopener,noreferrer");
}

// Preset Colors Mapping
const colorPresets = {
    blue: {
        "--primary": "#1a73e8",
        "--primary-hover": "#3b82f6",
        "--primary-glow": "rgba(26, 115, 232, 0.25)",
        "--accent": "#00f5ff",
        "--accent-glow": "rgba(0, 245, 255, 0.2)"
    },
    purple: {
        "--primary": "#a855f7",
        "--primary-hover": "#c084fc",
        "--primary-glow": "rgba(168, 85, 247, 0.25)",
        "--accent": "#f43f5e",
        "--accent-glow": "rgba(244, 63, 94, 0.2)"
    },
    green: {
        "--primary": "#10b981",
        "--primary-hover": "#34d399",
        "--primary-glow": "rgba(16, 185, 129, 0.25)",
        "--accent": "#00f5ff",
        "--accent-glow": "rgba(0, 245, 255, 0.2)"
    },
    orange: {
        "--primary": "#f97316",
        "--primary-hover": "#fb923c",
        "--primary-glow": "rgba(249, 115, 22, 0.25)",
        "--accent": "#fbbf24",
        "--accent-glow": "rgba(251, 191, 36, 0.2)"
    }
};

// Initialize Theme from Local Storage
function initializeTheme() {
    // 1. Theme mode (dark/light)
    const savedTheme = localStorage.getItem("theme-mode") || "dark";
    if (savedTheme === "light") {
        document.body.classList.add("light-theme");
        moonIcon.style.display = "none";
        sunIcon.style.display = "block";
    } else {
        document.body.classList.remove("light-theme");
        moonIcon.style.display = "block";
        sunIcon.style.display = "none";
    }

    // 2. Color Preset
    const savedPreset = localStorage.getItem("theme-preset") || "blue";
    applyPreset(savedPreset);
}

// Toggle Theme (Dark / Light)
function toggleTheme() {
    const isLight = document.body.classList.toggle("light-theme");
    if (isLight) {
        localStorage.setItem("theme-mode", "light");
        moonIcon.style.display = "none";
        sunIcon.style.display = "block";
    } else {
        localStorage.setItem("theme-mode", "dark");
        moonIcon.style.display = "block";
        sunIcon.style.display = "none";
    }
}

// Apply Color Preset Accent Variables
function applyPreset(presetName) {
    if (!colorPresets[presetName]) return;
    
    const preset = colorPresets[presetName];
    
    // Set custom CSS variables on root
    const root = document.documentElement;
    Object.keys(preset).forEach(variable => {
        root.style.setProperty(variable, preset[variable]);
    });
    
    // Update active preset button styling
    const buttons = themePresetsContainer.querySelectorAll(".theme-preset-btn");
    buttons.forEach(btn => {
        if (btn.getAttribute("data-preset") === presetName) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });
    
    localStorage.setItem("theme-preset", presetName);
}

