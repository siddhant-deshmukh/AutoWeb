import React, { useEffect, useState } from "react";
import { useCallback } from "react";
import { sendDomGetTask } from "./utils/sendDomGetCommands";
import { getSimplifiedDom } from "./utils/simplifyDOM";

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
  const [queryPrompt, setQueryPrompt] = useState<string | "">("")
  const [currPage, setCurrPage] = useState<'main' | 'setting'>('main')

  // <command>id=430 tagType={"button"}</command>

  const sendToDOm = useCallback(async (data: string) => {
    console.log(apiKey)
    const task = await sendDomGetTask(apiKey, data)
    if (task && Array.isArray(task)) {

    }
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
        
        const data = getSimplifiedDom(request.data)
        const html_ = data.outerHTML
        console.log("Get simplified dom", data, html_)

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

