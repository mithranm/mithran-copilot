// settings.js

document.addEventListener('DOMContentLoaded', function() {
    console.log('Settings page loaded');
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
    console.log('Loading API key');
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
    console.log('Saving API key');
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
    console.log('Loading dev mode setting');
    chrome.storage.local.get(['devMode'], function(result) {
        const isDevMode = result.devMode || false;
        console.log('Dev mode loaded:', isDevMode);
        document.getElementById('devModeToggle').checked = isDevMode;
    });
}

function toggleDevMode(event) {
    const isDevMode = event.target.checked;
    console.log('Toggling dev mode:', isDevMode);
    chrome.storage.local.set({ devMode: isDevMode }, function() {
        console.log('Dev mode saved:', isDevMode);
    });
    chrome.runtime.sendMessage({ action: "toggleDevMode", enabled: isDevMode }, function(response) {
        console.log('Toggle dev mode response:', response);
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