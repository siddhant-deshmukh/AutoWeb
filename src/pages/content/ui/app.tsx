import { useEffect } from 'react';
import { getSimplifiedDom } from './simplifyDOM';

export default function App() {
  useEffect(() => {
    console.log('content view loaded');

    function listner(message: any, _, sendResponse: (response?: any) => void) {
      console.log("HEre in content onMessage", message)
      if ((message.type === 'GET_DOM_DATA' || message.action === 'GET_DOM_DATA')) {
        // Extract specific data from the DOM (modify selectors as needed)
        // const title = document.title;
        // console.log(title)
        // const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
        //   .map(heading => heading.textContent);

        // const data = { title, headings };
        // console.log("Here the dom data", data)
        const data = getSimplifiedDom()
        const html_ = data.outerHTML
        console.log("Get simplified dom", data, html_)

        chrome.runtime.sendMessage({ action: "DOM_OBJECT_TO_BG_FROM_CONTENT", data: html_ }, function (response) {
          console.log("Message sent from content script", response);
        });

        sendResponse({ status: true });
      }
    }

    chrome.runtime.onMessage.addListener(listner);
    return () => {
      chrome.runtime.onMessage.removeListener(listner);
    }
  }, []);

  return <div className="">content view</div>;
}
