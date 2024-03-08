import { useState } from 'react'
import { useContext, useEffect } from 'react'

import { AppContext } from '../utils/AppContext'
import ExecutionController from './ExecutionController'


export default function Home() {

  const { apiKey, loding, tabId, setCurrPage, setLoding } = useContext(AppContext)

  const [userPrompt, setUserPrompt] = useState<string>("")
  const [taskState, setTaskState] = useState<"" | "executing" | "terminated">("")
  
  useEffect(() => {
    if (chrome && chrome.runtime) {
      chrome.runtime.sendMessage(
        { action: "GET_STORAGE_VALUE", key: "open-key" })
    }
    console.log("chrome", chrome)
    setLoding(false)
  }, [])

  if (loding) {
    return (
      <div className='w-full mt-10'>
        <div role="status" className='mx-auto'>
          <svg aria-hidden="true" className="w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
            <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill" />
          </svg>
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    )
  }
  if (!apiKey) {
    return (
      <div>
        <h1 className='text-lg mb-3'>No API key found</h1>
        <button
          type="button"
          onClick={() => {
            setCurrPage('setting')
          }}
          className="focus:outline-none text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800">
          Go to settings to add ApiKey
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="w-full flex justify-between items-center mb-5">
        <h1 className="text-xl font-extrabold">AutoWeb</h1>
        {/* <div>
          {apiKey}
        </div> */}
        <button
          type="button"
          onClick={() => {
            setCurrPage('setting')
          }}
          className="focus:outline-none text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
          Settings
        </button>
      </div>
      <h3 className='text-xs font-medium text-gray-700'>Enter some prompt <br />(the task you wanted to perform on your <u>current web page</u>)</h3>
      <div>
        <textarea
          id="message"
          rows={4}
          value={userPrompt}
          onChange={(e) => { setUserPrompt(e.target.value) }}
          className="block my-2.5 p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="What do you want your current page to do ....">
        </textarea>
        <button
          type="button"
          onClick={() => {
            // setCurrPage('setting')
            // if (chrome && chrome.runtime) {
            //   chrome.runtime.sendMessage(
            //     { action: "GET_DOM_DATA" }, function (response) {
            //       console.log("Get dom data response", response)
            //     })
            // }
            setTaskState('executing')
          }}
          className="mr-auto focus:outline-none text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
          Execute
        </button>
        {
          taskState === "executing" && 
          <ExecutionController 
            apiKey={apiKey}
            setTaskState={setTaskState}
            tabId={tabId}
            user_prompt={userPrompt}
          />
        }
      </div>
    </div>
  )
}
