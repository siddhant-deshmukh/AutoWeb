import { CompletionUsage } from 'openai/resources'
import React, { useEffect, useCallback, useRef, useState } from 'react'

import templatize from '../utils/templatize'
import { sleep } from '../utils/getFromContentScript'
import { getSimplifiedDom } from '../utils/simplifyDOM'
import { sendDomGetCommand } from '../utils/sendDomGetCommands'
import { attachDebugger, detachDebugger } from '../utils/chromeDebugger'
import { domClick, getObjectId, setValue } from '../utils/handleingDOMOperations'
import compressDom from '../utils/compressDOM'

export default function ExecutionController({ tabId, user_prompt, apiKey, setInfo, setTaskState }: {
  tabId: number
  apiKey: string
  user_prompt: string
  setInfo: React.Dispatch<React.SetStateAction<any[]>>
  setTaskState: React.Dispatch<React.SetStateAction<"" | "executing" | "terminated">>
}) {

  const firstTime = useRef<boolean>(true)
  const [tasksList, setTasksList] = useState<string[]>([])
  const [terminateStatus, setterminateStatus] = useState<boolean>(false)
  const [usage, setUsage] = useState<CompletionUsage>({
    completion_tokens: 0,
    prompt_tokens: 0,
    total_tokens: 0
  })


  const taskExecutionRef = useRef<ITaskExecutionState>({
    isTaskActive: true,
    aboutPreviousTask: [],
    currentState: 'noactive',
    iterationNumber: 0
  })

  const executePrompt = useCallback(async () => {
    try {
      console.log("Executing prompt")

      await sleep(1000)

      await attachDebugger(tabId)

      for (let i = 0; i < 1; i++) {
        if (!taskExecutionRef.current.isTaskActive) break;
        console.log(`---------------------            step ${i}            ----------------------------------------`)

        const currentTab = await chrome.tabs.get(tabId)


        const dom = await getSimplifiedDom()
        // const compact_dom = dom.outerHTML
        const compact_dom = templatize(dom.outerHTML)
        const compact_dom_2 = compressDom(dom)
        if (!taskExecutionRef.current.isTaskActive) break;
        
        console.log("compact_dom", compact_dom)
        break;
        const taskJson = await sendDomGetCommand(apiKey, { user_prompt, compact_dom: compact_dom, currentPageUrl: currentTab.url?.split("?")[0] }, taskExecutionRef.current.aboutPreviousTask)
        // console.log(taskJson)
        if (!taskExecutionRef.current.isTaskActive) break;
        if (taskJson.token_count > 20000 || taskJson.usage === undefined) {
          setTasksList((prev) => {
            return prev.slice().concat(["Aborting, token limit exceed"])
          })
          break;
        }
        setUsage((prev) => {
          if (taskJson.usage) {
            return {
              completion_tokens: prev.completion_tokens + taskJson.usage.completion_tokens,
              prompt_tokens: prev.prompt_tokens + taskJson.usage.prompt_tokens,
              total_tokens: prev.total_tokens + taskJson.usage.total_tokens,
            }
          }
          return { ...prev }
        })
        // console.log(taskJson.tasks, taskJson["tasks"], Array.isArray(taskJson["tasks"]), taskJson)

        // if (taskJson && taskJson.info && Array.isArray(taskJson.info) && taskJson.info.length > 0) {
        //   setInfo((prev) => {
        //     return prev.slice().concat(taskJson.info)
        //   })
        // }

        if (taskJson && Array.isArray(taskJson["tasks"])) {
          const tasks = taskJson.tasks
          console.log(i, "\tcurrent tasks", tasks)



          for (const { about, commandType, command } of tasks) {
            try {
              if (!taskExecutionRef.current.isTaskActive) break;

              if (commandType === 'back') {
                console.log("Going back")
                await chrome.tabs.goBack(tabId)
              } else if (commandType === 'forward') {
                console.log("Going forward")
                await chrome.tabs.goForward(tabId)
              } else if (commandType === 'finish') {
                console.log("----------------------      finished  ------------------------------------------")
                // taskExecutionRef.current = {
                //   ...taskExecutionRef.current,
                //   isTaskActive: false
                // }
              } else if (commandType === 'scanning-result' && command.result) {
                console.log("-------     Result --:", command.result)
                setInfo((prev) => {
                  return prev.slice().concat(JSON.stringify(command.result))
                })
              } else {
                // const command = commands[i]
                console.log(about, "The command", command)
                const id = parseInt(command.id as string)
                const objectId = await getObjectId(id, tabId);
                console.log("Unique id", objectId, command)


                if (!objectId) continue;

                // const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

                // const tabId = tabs[0].id;
                // return activeTab.id
                // const code = `document.getElementById('${objectId}').click();`;
                // console.log("code", code, "executing")
                // chrome.tabs.executeScript(activeTab.id, { code: code });

                if (!taskExecutionRef.current.isTaskActive) break;

                if (commandType === 'click') {
                  console.log("Going to click")
                  if (command.target === "_blank") {
                    console.error("Command target _blank")
                  } else {
                    await domClick(tabId, objectId)
                  }
                  // await chrome.debugger.sendCommand({ tabId }, "Runtime.callFunctionOn", {
                  //   objectId, // The objectId of the DOM node
                  //   functionDeclaration: "function() { this.click(); }", // Define a function to call click() on the node
                  //   returnByValue: false
                  // })
                } else if (commandType === 'typing' && typeof command.textToType === 'string') {
                  await setValue(tabId, objectId, command.textToType)
                  // console.log(`function() { this.value = '${command.textToType}'; }`)
                  // await typeText(tabId, command.textToType as string)
                  // const res = await chrome.debugger.sendCommand({ tabId }, "Runtime.callFunctionOn", {
                  //   objectId, // The objectId of the DOM node
                  //   functionDeclaration: `function() { this.value = '${command.textToType}'; }`, // Define a function to call click() on the node
                  //   returnByValue: false
                  // })
                  //@ts-ignore
                  // console.log("Typing ---------- ", res, res?.exceptionDetails)
                } else {
                  console.log("!!!!!!!!!!!!!!!!!!!!Something is wrong with this command!!!!!!!1111", command, about, commandType)
                }
              }

              taskExecutionRef.current = {
                ...taskExecutionRef.current,
                aboutPreviousTask: taskExecutionRef.current.aboutPreviousTask.slice().concat([about])
              }

              if (!taskExecutionRef.current.isTaskActive) break;

              if (command.tag === 'a') {
                console.log("Sleeping for 2 sec")
                setTasksList((prev) => {
                  return prev.slice().concat([about, "sleeping for 2 sec"])
                })
                await sleep(2000)
              } else {
                console.log("Sleeping for 1 sec")
                setTasksList((prev) => {
                  return prev.slice().concat([about, "sleeping for 1 sec"])
                })
                await sleep(1000)
              }

              console.log("task", i, "  done", about)

              // .catch((err) => {
              //   console.error("While runing debugger", err)
              // }).finally(() => {
              //   detachDebugger(tabId)
              // })
            } catch (err) {
              console.error("in command", command, about, err)
              setTasksList((prev) => {
                return prev.slice().concat([`got error executing last command: "${about}"`])
              })
            }
          }

          console.log("got commands", tasks)
        }

        console.log("Detaching debugger")
      }

      console.log("Closing")
      firstTime.current = false
      detachDebugger(tabId)
    } catch (err) {

      console.log("Closing")
      firstTime.current = false
      detachDebugger(tabId)
      console.error("While executing commads", err)
    }

  }, [tabId, user_prompt, apiKey, setTaskState])

  useEffect(() => {
    if (firstTime) {
      firstTime.current = false
      executePrompt()
    } else {

    }

    return () => {
      console.log("Closing")
      firstTime.current = false
      detachDebugger(tabId)
    }
  }, [])

  return (
    <div className='flex flex-col justify-end'>
      <div className='flex justify-between w-full items-center space-x-32'>
        <div className='flex w-full justify-between'>
          <div>Total: {usage.total_tokens}</div>
          <div>Prompt: {usage.prompt_tokens}</div>
        </div>
        <button
          onClick={() => {
            taskExecutionRef.current = {
              ...taskExecutionRef.current,
              isTaskActive: false
            }
            setterminateStatus(true)
            sleep(10000).finally(() => {
              setTaskState('terminated')
            })
          }}
          disabled={terminateStatus}
          className='px-3 py-1.5 rounded-xl ml-auto bg-red-500 text-white font-bold hover:bg-red-600'>
          {
            !terminateStatus &&
            <span>Terminate</span>
          }
          {
            terminateStatus &&
            <span>Terminating</span>
          }
        </button>
      </div>
      <ul className='border mt-5 max-h-[200px] overflow-y-auto'>
        {
          tasksList.map((task, index) => {
            return <li key={index} className='text-start flex items-center border-b'>
              <span className={`px-2 py-0.5 text-white ${(task.slice(0, 5) === "sleep") ? 'bg-yellow-500' : 'bg-blue-500'}`}>{index}.</span>
              <span className='px-2 py-0.5'>{task}</span>
            </li>
          })
        }
      </ul>
    </div>
  )
}

interface ITaskExecutionState {
  isTaskActive: boolean
  aboutPreviousTask: string[]
  currentState: string
  iterationNumber: number
}
// executePrompt(userPrompt, apiKey, tabId)


// async function executeAction(user_prompt: string, apiKey: string, tabId: number) {
//   try {
//     console.log("Executing prompt")

//     await attachDebugger(tabId)

//     const compact_dom = await getSimplifiedDom()
//     const taskJson = await sendDomGetCommand(apiKey, { user_prompt, compact_dom: compact_dom.outerHTML }, [])

//     console.log(taskJson.tasks, taskJson["tasks"], Array.isArray(taskJson["tasks"]), taskJson)

//     if (taskJson && Array.isArray(taskJson["tasks"])) {
//       const tasks = taskJson.tasks
//       console.log("tasks", tasks)

//       for (const { about, command } of tasks) {
//         // const command = commands[i]
//         console.log(about, "The command", command)
//         const id = parseInt(command.id as string)
//         const objectId = await getObjectId(id, tabId);
//         console.log("Unique id", objectId, command)


//         if (!objectId) continue;

//         // const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

//         // const tabId = tabs[0].id;
//         // return activeTab.id
//         // const code = `document.getElementById('${objectId}').click();`;
//         // console.log("code", code, "executing")
//         // chrome.tabs.executeScript(activeTab.id, { code: code });

//         const res = await chrome.debugger.sendCommand({ tabId }, "Runtime.callFunctionOn", {
//           objectId, // The objectId of the DOM node
//           functionDeclaration: "function() { this.click(); }", // Define a function to call click() on the node
//           returnByValue: false
//         })

//         await sleep(2000)
//         console.log("task 1 done", about)
//         // .catch((err) => {
//         //   console.error("While runing debugger", err)
//         // }).finally(() => {
//         //   detachDebugger(tabId)
//         // })
//       }

//       console.log("got commands", tasks)
//     }

//     console.log("Detaching debugger")
//     detachDebugger(tabId)
//   } catch (err) {
//     detachDebugger(tabId)
//     console.error("While executing commads", err)
//   }
// }