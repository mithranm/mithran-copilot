// sidepanel-logic.js
import { marked } from 'marked';
import DOMPurify from 'dompurify';

let chatbox, userinput, apiKeyInput, apiKeyStatus, newChatBtn;
let isDevMode = false;
let lastUserMessageElement = null;
let lastErrorElement = null;

export function initializeElements() {
    chatbox = document.getElementById('chatbox');
    userinput = document.getElementById('userinput');
    apiKeyInput = document.getElementById('apiKeyInput');
    apiKeyStatus = document.getElementById('apiKeyStatus');
    newChatBtn = document.getElementById('new-chat-btn');

    userinput.addEventListener('input', autoResize);
    loadChatHistory();

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "addToChatbox") {
            addToChatbox(request.text);
        }
    });
}

function addToChatbox(text) {
    if (userinput) {
        userinput.value += (userinput.value ? "\n" : "") + text;
        autoResize.call(userinput);
    }
}

function devLog(...args) {
    if (isDevMode) {
        console.log('[DEV]', ...args);
    }
}

export function toggleDevMode(event) {
    isDevMode = event.target.checked;
    chrome.runtime.sendMessage({ action: "toggleDevMode", enabled: isDevMode }, function(response) {
        console.log(response.status);
    });
}

function autoResize() {
    devLog('Auto-resizing textarea');
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';

    const lineHeight = parseInt(window.getComputedStyle(this).lineHeight);
    const maxHeight = lineHeight * 5;

    if (this.scrollHeight > maxHeight) {
        this.style.height = maxHeight + 'px';
        this.style.overflowY = 'auto';
    } else {
        this.style.overflowY = 'hidden';
    }
}

export async function loadApiKey() {
    devLog('Loading API key');
    try {
        const result = await chrome.storage.sync.get(['apiKey']);
        if (result.apiKey) {
            apiKeyInput.value = result.apiKey;
            updateApiKeyStatus('API Key is set', 'green');
        } else {
            updateApiKeyStatus('API Key is not set', 'red');
        }
    } catch (error) {
        devLog('Error loading API key:', error);
        console.error('Error loading API key:', error);
        updateApiKeyStatus('Error loading API Key', 'red');
    }
}

export function saveApiKey() {
    devLog('Saving API key');
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
        try {
            chrome.storage.sync.set({ apiKey: apiKey }, function () {
                devLog('API key saved successfully');
                console.log('API key saved');
                updateApiKeyStatus('API Key saved successfully', 'green');
            });
        } catch (error) {
            devLog('Error saving API key:', error);
            console.error('Error saving API key:', error);
            updateApiKeyStatus('Error saving API Key', 'red');
        }
    } else {
        updateApiKeyStatus('Please enter a valid API Key', 'red');
    }
}

export function sendMessage() {
    devLog('Sending message');
    const message = userinput.value;
    if (message) {
        // Remove last error message and its corresponding user message if they exist
        if (lastErrorElement) {
            lastErrorElement.remove();
            if (lastUserMessageElement) {
                lastUserMessageElement.remove();
            }
            lastErrorElement = null;
            lastUserMessageElement = null;
        }

        lastUserMessageElement = appendMessage('You', message);
        userinput.value = '';
        autoResize.call(userinput);

        // Show a loading indicator
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'message assistant loading';
        loadingIndicator.textContent = 'Thinking...';
        chatbox.appendChild(loadingIndicator);

        chrome.runtime.sendMessage({ action: "sendToLLM", message: message }, function (response) {
            // Remove the loading indicator
            chatbox.removeChild(loadingIndicator);

            if (chrome.runtime.lastError) {
                devLog('Error sending message:', chrome.runtime.lastError);
                console.error('Error:', chrome.runtime.lastError);
                handleError('Unable to send message. Please try again later.');
                return;
            }

            if (response.status === 'error') {
                handleError(response.reply);
            } else {
                devLog('Received response:', response.reply);
                appendMessage('LLM', response.reply);
                lastUserMessageElement = null; // Reset lastUserMessageElement on successful response
            }
        });
    }
}

function handleError(errorMessage) {
    lastErrorElement = document.createElement('div');
    lastErrorElement.className = 'message error';
    lastErrorElement.innerHTML = `
        <span class="sender">Error:</span>
        <div class="content">
            <p>${errorMessage}</p>
            <p>Please try again or rephrase your prompt.</p>
        </div>
    `;
    chatbox.appendChild(lastErrorElement);
    chatbox.scrollTop = chatbox.scrollHeight;
}

export function appendMessage(sender, message) {
    devLog('Appending message from:', sender);
    devLog('Original message:', message);

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender.toLowerCase()} fade-in`;

    const senderSpan = document.createElement('span');
    senderSpan.className = 'sender';
    senderSpan.textContent = sender + ': ';
    messageDiv.appendChild(senderSpan);

    const contentDiv = document.createElement('div');
    contentDiv.className = 'content';

    devLog('Message before marked processing:', message);
    const rawHtml = marked.parse(message);
    devLog('Message after marked processing (raw HTML):', rawHtml);
    const sanitizedHtml = DOMPurify.sanitize(rawHtml);
    devLog('Message after DOMPurify sanitization:', sanitizedHtml);

    contentDiv.innerHTML = sanitizedHtml;

    messageDiv.appendChild(contentDiv);

    chatbox.appendChild(messageDiv);
    chatbox.scrollTop = chatbox.scrollHeight;

    return messageDiv;
}

export function setupNewChat() {  // Changed from setupNewChatButton to setupNewChat
    devLog('Setting up new chat');
    chatbox.innerHTML = '';
    chrome.runtime.sendMessage({ action: "newChat" }, function (response) {
        devLog('New chat created:', response.status);
        console.log(response.status);
    });
}

function updateApiKeyStatus(message, color) {
    devLog('Updating API key status:', message, color);
    apiKeyStatus.textContent = message;
    apiKeyStatus.style.color = color;
}

export function loadChatHistory() {
    devLog('Loading chat history');
    chrome.runtime.sendMessage({ action: "getChatHistory" }, function (response) {
        if (chrome.runtime.lastError) {
            devLog('Error loading chat history:', chrome.runtime.lastError);
            console.error('Error:', chrome.runtime.lastError);
            return;
        }
        chatbox.innerHTML = ''; // Clear existing messages
        response.history.forEach(message => {
            appendMessage(message.role === 'user' ? 'You' : 'LLM', message.content);
        });
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

export const debouncedSaveApiKey = debounce(saveApiKey, 300);