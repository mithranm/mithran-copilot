let isDevMode = false;

console.log('Background script loaded'); // This should always appear

function devLog(...args) {
  console.log('[DEV]', ...args); // Always log, we'll check isDevMode inside
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed or updated');
  chrome.contextMenus.create({
    id: "addToChatbox",
    title: "Add to Mithran Copilot",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log('Context menu clicked', info.menuItemId);
  if (info.menuItemId === "addToChatbox" && info.selectionText) {
    chrome.runtime.sendMessage({
      action: "addToChatbox",
      text: info.selectionText
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request.action);
  if (request.action === "sendToLLM") {
    handleLLMRequest(request.message, sendResponse);
    return true;
  } else if (request.action === "newChat") {
    clearChatHistory();
    sendResponse({status: "Chat history cleared"});
  } else if (request.action === "getChatHistory") {
    getChatHistory().then(history => sendResponse({history}));
    return true;
  } else if (request.action === "toggleDevMode") {
    toggleDevMode(request.enabled).then(() => {
      sendResponse({status: `Dev mode ${isDevMode ? 'enabled' : 'disabled'}`});
    });
    return true;
  }
});

async function handleLLMRequest(message, sendResponse) {
  devLog('Handling LLM request:', message);
  try {
    const { apiKey } = await chrome.storage.sync.get(['apiKey']);
    if (!apiKey) {
      devLog('API key not set');
      sendResponse({reply: "API key not set. Please set your API key in the extension popup."});
      return;
    }

    let chatHistory = await getChatHistory();
    chatHistory.push({"role": "user", "content": message});
    await saveChatHistory(chatHistory);

    devLog('Sending request to API');
    const response = await fetchWithRetry('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        "model": "deepseek-chat",
        "messages": [
          {"role": "system", "content": "You are a helpful assistant. Please format your responses using markdown."},
          ...chatHistory
        ],
        "stream": false
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    devLog('Received API response:', data);

    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      const reply = data.choices[0].message.content;
      chatHistory.push({"role": "assistant", "content": reply});
      await saveChatHistory(chatHistory);
      sendResponse({reply: reply});
    } else {
      throw new Error('Unexpected API response structure');
    }
  } catch (error) {
    console.error('Error in handleLLMRequest:', error);
    sendResponse({reply: `Error: ${error.message}`});
  }
}

async function getChatHistory() {
  const result = await chrome.storage.local.get(['chatHistory']);
  devLog('Retrieved chat history:', result.chatHistory);
  return result.chatHistory || [];
}

async function saveChatHistory(chatHistory) {
  await chrome.storage.local.set({ chatHistory });
  devLog('Saved chat history');
}

async function clearChatHistory() {
  await chrome.storage.local.remove(['chatHistory']);
  devLog('Cleared chat history');
}

async function toggleDevMode(enabled) {
  isDevMode = enabled;
  await chrome.storage.local.set({ devMode: isDevMode });
  console.log(`Dev mode ${isDevMode ? 'enabled' : 'disabled'}`); // Always log this
  devLog(`Dev mode toggled to ${isDevMode}`);
}

chrome.action.onClicked.addListener((tab) => {
  console.log('Action clicked, opening side panel');
  chrome.sidePanel.open({tabId: tab.id});
});

function fetchWithTimeout(url, options, timeout = 120000) {
  devLog('Fetching with timeout:', url);
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out')), timeout)
    )
  ]);
}

async function fetchWithRetry(url, options, maxRetries = 3) {
  devLog('Fetching with retry:', url);
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetchWithTimeout(url, options);
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i))); // Exponential backoff
    }
  }
  throw lastError;
}

// Load dev mode setting when service worker starts
chrome.storage.local.get(['devMode'], function(result) {
  isDevMode = result.devMode || false;
  console.log('Dev mode loaded:', isDevMode); // Always log this
});

// Log any unhandled errors
self.addEventListener('error', function(event) {
  console.error('Unhandled error:', event.error);
});

// Log any unhandled promise rejections
self.addEventListener('unhandledrejection', function(event) {
  console.error('Unhandled promise rejection:', event.reason);
});