import reloadOnUpdate from 'virtual:reload-on-update-in-background-script';
import 'webextension-polyfill';

reloadOnUpdate('pages/background');

/**
 * Extension reloading is necessary because the browser automatically caches the css.
 * If you do not use the css of the content script, please delete it.
 */
reloadOnUpdate('pages/content/style.scss');

console.log('background.ts loaded');


async function getStorageValue(key: string): Promise<any> {
  // console.log("Here in getStorage", key)
  const data = await chrome.storage.local.get(key);

  if (chrome && chrome.runtime) {
    console.log("Sending to popup", data, data[key])
    chrome.runtime.sendMessage({
      message: "SEND_API_KEY_VALUE",
      data,
    })
  }
  // console.log("Here in getStorage2", data)
  return data[key];
}

// Function to store data in local storage
async function setStorageValue(key: string, value: any) {
  // console.log("Here in setStorage", key, value)
  await chrome.storage.local.set({ [key]: value });
  // console.log("Here in setStorage2", key, value)
  return value
}

async function sendDomDataToPopup(data: string){
  // console.log("Sending message", "DOM_OBJECT_TO_POPUP_FROM_BG")
  chrome.runtime.sendMessage({
    message: "DOM_OBJECT_TO_POPUP_FROM_BG",
    data,
  })
}

// (Optional) Listen for messages from popup script
chrome.runtime.onMessage.addListener((message, _, sendResponse) => { //sender
  console.log("onMessage", message, message.action, message.action === 'GET_STORAGE_VALUE', message.key)
  if (message.action === 'GET_STORAGE_VALUE') {
    getStorageValue(message.key).then((_) => { sendResponse({ status: 'ok' }); });
  } else if (message.action === 'SET_STORAGE_VALUE') {
    setStorageValue(message.key, message.value)
    // sendResponse({ success: true }); // Optional confirmation
  } else if (message.action === "GET_DOM_DATA") {

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab && tab.id) {
        // console.log("Sending message to content GET_DOM_DATA", tab.id, tab.url)
        chrome.tabs.sendMessage(tab.id, { type: 'GET_DOM_DATA' })
          .then(data => {
            // console.log("The data recieved after sendMessage", data)
            sendResponse(data)
          });
      }
    });
  } else if (message.action === "DOM_OBJECT_TO_BG_FROM_CONTENT") {
    // console.log("Got message in bg script", message)

    sendDomDataToPopup(message.data)
  }
});