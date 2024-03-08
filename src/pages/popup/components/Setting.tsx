import { useContext, useRef } from "react"
import { AppContext } from "../utils/AppContext"

export default function Setting() {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const { setCurrPage, setApiKey } = useContext(AppContext)

  return (
    <div className="flex flex-col">
      <div className="flex space-x-5">
        <button
          onClick={() => { setCurrPage('main') }}
          className="font-extrabold text-xl">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </button>
        <h3 className="text-lg">Settings</h3>
      </div>

      <div className="mt-5 mr-auto border border-gray-700 rounded-lg overflow-hidden w-auto flex">
        <input ref={inputRef} type="password" className="px-3 py-0.5 outline-none" />
        <button
          onClick={() => {
            if (chrome && chrome.runtime && inputRef.current && inputRef.current.value.length > 0) {
              chrome.runtime.sendMessage({
                action: "SET_STORAGE_VALUE",
                key: "open-key",
                value: inputRef.current.value
              }).then((value) => {
                console.log("After sending", value)
                setApiKey(inputRef.current?.value as string)
                setCurrPage('main')
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
  )
}
