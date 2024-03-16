import { useRef } from "react";
import React, { useEffect, useState } from "react";

export const AppContext = React.createContext<{
  loding: boolean
  setLoding: React.Dispatch<React.SetStateAction<boolean>>
  apiKey: string | null
  setApiKey: React.Dispatch<React.SetStateAction<string | null>>
  currPage: "main" | "setting"
  setCurrPage: React.Dispatch<React.SetStateAction<"main" | "setting">>
  tabId: number
}>({
  loding: true,
  apiKey: null,
  currPage: "main",
  tabId: -1,
  setLoding: () => { },
  setApiKey: () => { },
  setCurrPage: () => { }
})

export const AppContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [loding, setLoding] = useState<boolean>(true)
  const [apiKey, setApiKey] = useState<string | null>(null)
  // const [queryPrompt, setQueryPrompt] = useState<string | "">("")
  const [currPage, setCurrPage] = useState<'main' | 'setting'>('main')
  const [tabId, setTabId] = useState<number>(-1)
  const tabIdRef = useRef<number>(-1)
  // <command>id=430 tagType={"button"}</command>

  // const sendToDOm = useCallback(async (data: string) => {
  //   console.log(apiKey)
  //   const task = await sendDomGetTask(apiKey, data)
  //   if (task && Array.isArray(task)) {

  //   }
  // }, [apiKey])

  useEffect(() => {

    chrome.tabs.query({ active: true, currentWindow: true }).then((tabs)=>{
      const tabId = tabs[0].id;
      tabIdRef.current = tabId

      setTabId(tabId)
      // attachDebugger(tabId)
    });

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
      } 
      // else if (request.message === "DOM_OBJECT_TO_POPUP_FROM_BG") {
      //   console.log("DOM data", request.data)
      //   const data = getSimplifiedDom(req)
      //   const html_ = data.outerHTML
      //   console.log("Get simplified dom", data, html_)

      //   sendToDOm(request.data)
      // }
    }

    // console.log("Adding event listner")
    chrome.runtime.onMessage.addListener(eventListnerCallback);
    return () => {
      // console.log("removing event listner")
      // if(tabIdRef.current != -1){
      //   detachDebugger(tabIdRef.current)
      // }
      chrome.runtime.onMessage.removeListener(eventListnerCallback)
    }
  }, [])

  return (
    <AppContext.Provider value={{
      tabId,
      loding, setLoding,
      apiKey, setApiKey,
      currPage, setCurrPage,
    }}>
      {children}
    </AppContext.Provider>
  )
}

