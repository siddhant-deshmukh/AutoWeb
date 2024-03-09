import getAnnotatedDOM, { getUniqueElementSelectorId, ripple } from "./getDomOp";

console.log("Here in content script")

chrome.runtime.onMessage.addListener(
  (message, sender, sendResponse): true | undefined => {

    // console.log("----------- content script Message: ", message, sendResponse)
    const type = message.type;
    if (type === 'GET_COMPREESED_DOM') {
      const resp = getAnnotatedDOM();
      sendResponse(resp);
    } else if (type === 'GET_REAL_OBJECT_ID') {
      const resp = getUniqueElementSelectorId(message.payload);
      sendResponse(resp);
    } else if (type === 'RIPPLE') {
      ripple(message.payload[0], message.payload[1]).then((resp) => {
        sendResponse(resp)
      })
    } else {
      console.error("Unknown message type", message.type, message)
    }
    return true
  }
);