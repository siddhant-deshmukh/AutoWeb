import { useState } from 'react'
import { useContext, useEffect } from 'react'

import { AppContext } from '../AppContext'
import ExecutionController from './ExecutionController'
import Setting from './Setting'


export default function Home() {

  const { apiKeys, loding, tabId, setCurrPage, setLoding } = useContext(AppContext)

  const [info, setInfo] = useState<any[]>([])
  const [mainTask, setMainTask] = useState<string>("")
  const [taskState, setTaskState] = useState<"" | "executing" | "terminated">("")

  useEffect(() => {
    if (chrome && chrome.runtime) {
      chrome.runtime.sendMessage(
        { action: "GET_STORAGE_VALUE", key: "openai" });
      chrome.runtime.sendMessage(
        { action: "GET_STORAGE_VALUE", key: "claude" });
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
  if (!apiKeys.claude || !apiKeys.openai) {
    return (
      <div>
        {/* <h1 className='text-lg mb-3'>No API key found</h1>
        <button
          type="button"
          onClick={() => {
            setCurrPage('setting')
          }}
          className="focus:outline-none text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800">
          Go to settings to add ApiKey
        </button> */}
        <Setting />
      </div>
    )
  }

  return (
    <div>
      <div className="w-full flex justify-between mb-5">
        <h1 className="text-xl font-extrabold">AutoWeb</h1>
        {/* <div>
          {apiKey}
        </div> */}
        <button
          type="button"
          onClick={() => {
            setCurrPage('setting')
          }}
          className='group'>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 group-hover:fill-blue-300">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
        </button>
        {/* <button
          type="button"
          onClick={() => {
            setCurrPage('setting')
          }}
          className="focus:outline-none text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
          Settings
        </button> */}
      </div>
      <h3 className='text-xs text-left font-medium text-gray-700'>Enter some prompt <br />(the task you wanted to perform on your <u>current web page</u>)</h3>
      <div className='flex flex-col justify-start'>
        <textarea
          id="message"
          rows={4}
          value={mainTask}
          onChange={(e) => { setMainTask(e.target.value) }}
          className="block my-2.5 p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="What do you want your current page to do ....">
        </textarea>
        <button
          type="button"
          disabled={taskState === 'executing'}
          onClick={() => {
            // chrome.tabs.query({ active: true, currentWindow: true })
            //   .then((tabs) => {
            //     chrome.tabs.update(tabs[0].id, { url: "https://google.com/" })
            //       .then(() => {
            //         setTaskState('executing')
            //       }).catch((err) => {
            //         console.error("Error while going to google.com", err)
            //       })
            //   }).catch((err) => {
            //     console.error("Error while going to google.com", err)
            //   })

            // chrome.tabs.query({ active: true, currentWindow: true })
            //   .then((tabs) => {
            //     chrome.tabs.goBack(tabs[0].id)
            //       .then(() => {
            //         console.log("Done!")
            //         // setTaskState('executing')
            //       }).catch((err) => {
            //         console.error("Error while going to google.com", err)
            //       })
            //   }).catch((err) => {
            //     console.error("Error while going to google.com", err)
            //   })

            setTaskState('executing')
          }}
          className="mr-auto focus:outline-none text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
          {
            taskState === "executing" &&
            <span>Executing</span>
          }
          {
            taskState != "executing" &&
            <span>Execute</span>
          }
        </button>
        {
          taskState === "executing" &&
          <ExecutionController
            apiKeys={apiKeys}
            setInfo={setInfo}
            setTaskState={setTaskState}
            tabId={tabId}
            main_task={mainTask}
          />
        }
        {
          taskState != "executing" && info.length > 0 &&
          <ul>
            {
              info.map((str) => {
                return <li className='p-2 border' >{JSON.stringify(str)}</li>
              })
            }
          </ul>
        }
      </div>
    </div>
  )
}
