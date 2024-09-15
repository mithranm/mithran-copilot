// settings.js

document.addEventListener('DOMContentLoaded', function() {
    const saveApiKeyButton = document.getElementById('saveApiKey');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const apiKeyStatus = document.getElementById('apiKeyStatus');
    const devModeToggle = document.getElementById('devModeToggle');

    loadApiKey();
    loadDevMode();

    saveApiKeyButton.addEventListener('click', saveApiKey);
    apiKeyInput.addEventListener('input', debounce(saveApiKey, 300));
    devModeToggle.addEventListener('change', toggleDevMode);
});

async function loadApiKey() {
    try {
        const result = await chrome.storage.sync.get(['apiKey']);
        if (result.apiKey) {
            document.getElementById('apiKeyInput').value = result.apiKey;
            updateApiKeyStatus('API Key is set', 'green');
        } else {
            updateApiKeyStatus('API Key is not set', 'red');
        }
    } catch (error) {
        console.error('Error loading API key:', error);
        updateApiKeyStatus('Error loading API Key', 'red');
    }
}

function saveApiKey() {
    const apiKey = document.getElementById('apiKeyInput').value.trim();
    if (apiKey) {
        try {
            chrome.storage.sync.set({ apiKey: apiKey }, function () {
                console.log('API key saved');
                updateApiKeyStatus('API Key saved successfully', 'green');
            });
        } catch (error) {
            console.error('Error saving API key:', error);
            updateApiKeyStatus('Error saving API Key', 'red');
        }
    } else {
        updateApiKeyStatus('Please enter a valid API Key', 'red');
    }
}

function updateApiKeyStatus(message, color) {
    const apiKeyStatus = document.getElementById('apiKeyStatus');
    apiKeyStatus.textContent = message;
    apiKeyStatus.style.color = color;
}

function loadDevMode() {
    chrome.storage.sync.get(['devMode'], function(result) {
        document.getElementById('devModeToggle').checked = result.devMode || false;
    });
}

function toggleDevMode(event) {
    const isDevMode = event.target.checked;
    chrome.storage.sync.set({ devMode: isDevMode }, function() {
        console.log('Dev mode ' + (isDevMode ? 'enabled' : 'disabled'));
    });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}