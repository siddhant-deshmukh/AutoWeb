import React, { useEffect, useState } from "react";
import { useCallback } from "react";
import { sendDom } from "./utils/sendDomGetCommands";

export const AppContext = React.createContext<{
  loding: boolean
  setLoding: React.Dispatch<React.SetStateAction<boolean>>
  apiKey: string | null
  setApiKey: React.Dispatch<React.SetStateAction<string | null>>
  currPage: "main" | "setting"
  setCurrPage: React.Dispatch<React.SetStateAction<"main" | "setting">>
}>({
  loding: true,
  apiKey: null,
  currPage: "main",
  setLoding: () => { },
  setApiKey: () => { },
  setCurrPage: () => { }
})

export const AppContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [loding, setLoding] = useState<boolean>(true)
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [currPage, setCurrPage] = useState<'main' | 'setting'>('main')
  const [queryPrompt, setQueryPrompt] = useState<string | "">("")


  const sendToDOm = useCallback((data: string) => {
    console.log(apiKey)
    sendDom(apiKey, data)
  }, [apiKey])

  useEffect(() => {
    //@ts-ignore
    function eventListnerCallback(request, sender, sendResponse) {
      // console.log("Here in popup", request)
      if (request.message === "SEND_API_KEY_VALUE") {
        console.log(request.message, request)
        if (request && request.data && request.data['open-key']) {
          setApiKey(request.data['open-key'] as string)
          // if(apiKey === null){
          // }
        }
      } else if (request.message === "DOM_OBJECT_TO_POPUP_FROM_BG") {
        console.log("DOM data", request.data)
        sendToDOm(request.data)
      }
    }

    // console.log("Adding event listner")
    chrome.runtime.onMessage.addListener(eventListnerCallback);
    return () => {
      // console.log("removing event listner")
      chrome.runtime.onMessage.removeListener(eventListnerCallback)
    }
  }, [apiKey])

  return (
    <AppContext.Provider value={{
      loding, setLoding,
      apiKey, setApiKey,
      currPage, setCurrPage,
    }}>
      {children}
    </AppContext.Provider>
  )
}

