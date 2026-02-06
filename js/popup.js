// Function injected into the page to detect WordPress-related directories and source code markers
async function detectWordPressDirectories() {
    const baseUrl = window.location.origin;
    const wpDirs = ['wp-admin', 'wp-includes', 'wp-content', 'wp-config.php', 'wp-login.php'];
    const results = {};

    // 1. Check for existence of common WP directories/files
    for (const dir of wpDirs) {
        try {
            const response = await fetch(`${baseUrl}/${dir}/`, {
                method: 'HEAD',
                mode: 'no-cors'
            });
            results[dir] = response.ok;
        } catch (e) {
            results[dir] = false;
        }
    }

    // 2. Search HTML source for known WordPress patterns
    const html = document.documentElement.outerHTML.toLowerCase();
    const wpKeywords = ['content="wordpress', 'wp-admin', 'wp-includes', 'wp-content'];
    const foundInSource = wpKeywords.some(keyword => html.includes(keyword));

    // 4. Get active theme from source code
    const themePaths = [...html.matchAll(/\/wp-content\/themes\/([^\/"'\\\s]+)/g)];
    const activeTheme = [...new Set(themePaths.map(match => match[1]))];

    return {
        isWordPress: Object.values(results).some(Boolean) && foundInSource,
        foundDirs: Object.keys(results).filter(dir => results[dir]),
        foundInSource,
        activeTheme
    };
}

// Element Styler
function styleElement(element, property, value) {
    document.querySelector(element).style.setProperty(property, value);
}

// Slug to Title Converter
function slugToTitle(slug) {
    return slug
        .replace(/[-_]+/g, ' ')        // Replace dashes and underscores with spaces
        .replace(/\s+/g, ' ')          // Replace multiple spaces with a single space
        .trim()                        // Trim leading/trailing whitespace
        .replace(/\w\S*/g, function (txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });                            // Capitalize first letter of each word
}

// Handle the "Analyze Website" button click
document.getElementById('check').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const resultElement = document.getElementById('result');
    resultElement.innerHTML = 'Analyzing the Website...';
    const themeElement = document.getElementById('themes');
    const moduleBox = document.getElementById('module-box');

    const viewModules = document.getElementById('view-modules');
    viewModules.classList.remove("active")

    document.querySelector(".loader-box").classList.add("active")
    styleElement(".loader", "height", "80px")
    styleElement("#result", "color", "#313c46")
    // Reset sections
    styleElement(".found", "height", "0")
    styleElement(".not-found", "height", "0")
    styleElement("#module-box", "height", "0")

    try {
        const response = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: detectWordPressDirectories,
        });

        const result = response[0]?.result;
        if (!result) throw new Error('Detection failed - no response from page');

        const { isWordPress, foundDirs, foundInSource, activeTheme } = result;

        if (isWordPress && foundInSource) {
            styleElement(".logo", "height", "0")
            styleElement(".not-found", "height", "0")
            styleElement(".found", "height", "80px")
            styleElement("#result", "color", "#009045")
            // resultElement.innerHTML = `WordPress Detected<br>Found directories: ${foundDirs.join(', ')}`;
            resultElement.textContent = 'This Website is Built in WordPress.';
            activeTheme.forEach(theme => {
                themeElement.innerHTML = `<div class="module-item"><h3>${slugToTitle(theme)}</h3><span>https://wordpress.org/themes/${theme}</span></div>`;
            });
            viewModules.classList.add("active")
            viewModules.addEventListener('click', () => {
                viewModules.classList.remove("active")
                moduleBox.style.setProperty("height", moduleBox.scrollHeight + "px")
            })
        } else {
            viewModules.classList.remove("active")
            styleElement(".logo", "height", "0")
            styleElement(".found", "height", "0")
            styleElement(".not-found", "height", "80px")
            styleElement("#result", "color", "#ed1c24")
            resultElement.textContent = 'This Website not Built in WordPress.';
        }
    } catch (error) {
        styleElement("#result", "color", "#ed1c24")
        resultElement.textContent = `Error: ${error.message}`;
    }
});