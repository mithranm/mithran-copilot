// sidepanel.js

import * as SidepanelModule from './sidepanel-logic.js';

document.addEventListener('DOMContentLoaded', async function() {
    SidepanelModule.initializeElements();

    const sendButton = document.getElementById('send');
    const newChatBtn = document.getElementById('new-chat-btn');
    const settingsBtn = document.getElementById('settings-btn');

    sendButton.addEventListener('click', SidepanelModule.sendMessage);
    newChatBtn.addEventListener('click', SidepanelModule.setupNewChat);
    settingsBtn.addEventListener('click', openSettings);

    // Load chat history
    SidepanelModule.loadChatHistory();
});

function openSettings() {
    chrome.tabs.create({ url: 'settings.html' });
}