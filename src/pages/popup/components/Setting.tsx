import { useContext, useRef } from "react"
import { AppContext } from "../AppContext"
import { useEffect } from "react"

export default function Setting() {
  
  const { setCurrPage, setApiKeys, apiKeys } = useContext(AppContext)

  const openKeyRef = useRef<HTMLInputElement | null>(null)
  const claudeKeyRef = useRef<HTMLInputElement | null>(null)

  useEffect(()=>{
    if(openKeyRef.current && claudeKeyRef.current){
      openKeyRef.current.value = (apiKeys.openai)?apiKeys.openai:""
      claudeKeyRef.current.value = (apiKeys.claude)?apiKeys.claude:""
    }
  },[])

  return (
    <div className="flex flex-col">
      <div className="flex space-x-5">
        {
          apiKeys.claude && apiKeys.openai &&
          <button
            onClick={() => { setCurrPage('main') }}
            className="font-extrabold text-xl">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </button>
        }
        <h3 className="text-lg font-semibold">Settings</h3>
      </div>

      <div className="mt-5 mr-auto ">
        <h6 className="font-medium pb-1.5 text-left text-xs text-gray-900">Claude / Antropic Key (to access Haiku and Sonnet)</h6>
        <div className="mt-1.5 border border-gray-700 rounded-lg overflow-hidden w-auto flex">
          <input ref={claudeKeyRef} type="password" className="px-3 py-0.5 outline-none" />
          <button
            onClick={() => {
              if (chrome && chrome.runtime && claudeKeyRef.current && claudeKeyRef.current.value.length > 0) {
                chrome.runtime.sendMessage({
                  action: "SET_STORAGE_VALUE",
                  key: "claude",
                  value: claudeKeyRef.current.value
                }).then((value) => {
                  console.log("After sending", value)
                  setApiKeys((prev) => {
                    return {
                      ...prev,
                      claude: claudeKeyRef.current?.value as string
                    }
                  })
                  // setCurrPage('main')
                });
              }
              // if (chrome && chrome?.storage && claudeKeyRef.current && claudeKeyRef.current.value.length > 0) {
              //   chrome?.storage?.local?.set({
              //     'open-key': claudeKeyRef.current.value
              //   }).then(() => {
              //     if (claudeKeyRef.current) {
              //       setApiKey(claudeKeyRef.current?.value)
              //     }
              //   })
              // }
            }}
            className="text-sm font-bold text-white px-3 py-2.5 bg-blue-700 hover:bg-blue-800">Add/update</button>
        </div>
      </div>


      <div className="mt-5 mr-auto ">
        <h6 className="font-medium pb-1.5 text-left text-xs text-gray-900">GPT / Openai Key (to access GPT 3.5 turbo)</h6>
        <div className="border border-gray-700 rounded-lg overflow-hidden w-auto flex">
          <input ref={openKeyRef} type="password" className="px-3 py-0.5 outline-none" />
          <button
            onClick={() => {
              if (chrome && chrome.runtime && openKeyRef.current && openKeyRef.current.value.length > 0) {
                chrome.runtime.sendMessage({
                  action: "SET_STORAGE_VALUE",
                  key: "openai",
                  value: openKeyRef.current.value
                }).then((value) => {
                  console.log("After sending", value)
                  setApiKeys((prev) => {
                    return {
                      ...prev,
                      openai: openKeyRef.current?.value as string
                    }
                  })
                  // setCurrPage('main')
                });
              }
              // if (chrome && chrome?.storage && inputRef.current && inputRef.current.value.length > 0) {
              //   chrome?.storage?.local?.set({
              //     'open-key': inputRef.current.value
              //   }).then(() => {
              //     if (inputRef.current) {
              //       setApiKey(inputRef.current?.value)
              //     }
              //   })
              // }
            }}
            className="text-sm font-bold text-white px-3 py-2.5 bg-blue-700 hover:bg-blue-800">Add/update</button>
        </div>
      </div>
    </div>
  )
}
