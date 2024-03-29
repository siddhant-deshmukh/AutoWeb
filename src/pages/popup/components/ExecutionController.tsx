import { CompletionUsage } from 'openai/resources'
import React, { useEffect, useCallback, useRef, useState } from 'react'

import { sleep } from '../utils/getFromContentScript'
import { getSimplifiedDom } from '../utils/simplifyDOM'
import { sendDomGetCommand } from '../utils/sendDomGetCommands'
import { attachDebugger, detachDebugger } from '../utils/chromeDebugger'
import { domClick, getObjectId, setValue } from '../utils/handleingDOMOperations'

export default function ExecutionController({ tabId, main_task, apiKeys, setInfo, setTaskState }: {
  tabId: number
  apiKeys: { openai: string, claude: string }
  main_task: string
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

  function exitLoop(msg: string) {
    taskExecutionRef.current = {
      ...taskExecutionRef.current,
      isTaskActive: false
    }
    setTasksList((prev) => {
      return prev.slice().concat([msg])
    })
    firstTime.current = false
    detachDebugger(tabId)
  }

  const executePrompt = useCallback(async () => {
    try {
      await sleep(1000)

      await attachDebugger(tabId)

      for (let i = 0; i < 20; i++) {
        if (!taskExecutionRef.current.isTaskActive) break;
        console.log(`---------------------            step ${i}            ----------------------------------------`)

        const currentTab = await chrome.tabs.get(tabId)


        const dom = await getSimplifiedDom()
        const compact_dom = dom.outerHTML

        if (!taskExecutionRef.current.isTaskActive) break;

        console.log("DOM", dom)
        // Get the Command by sending the DOM
        // break;
        const taskJson = await sendDomGetCommand(apiKeys, { main_task, compact_dom: compact_dom, currentPageUrl: currentTab.url?.split("?")[0] }, taskExecutionRef.current.aboutPreviousTask)
        console.log(taskJson)
        // break;

        if (!taskJson || !Array.isArray(taskJson?.task.actions) || taskJson.err){
          taskExecutionRef.current = {
            ...taskExecutionRef.current,
            isTaskActive: false
          }
          exitLoop("Aborting, error while executing prompt");
          break;
        }
        console.log("taskJSON", taskJson)

        // If token count limit exceed
        if (!taskExecutionRef.current.isTaskActive) break;
        // if (taskJson.token_count > 20000 || taskJson.usage === undefined) {
        //   exitLoop("Token limit exceed")
        // }

        // Setting the usage
        setUsage((prev) => {
          if (taskJson.usage) {
            return {
              completion_tokens: prev.completion_tokens, //+ taskJson.usage.completion_tokens,
              prompt_tokens: prev.prompt_tokens + taskJson.usage.input_tokens,
              total_tokens: prev.total_tokens + taskJson.usage.output_tokens,
            }
          }
          return { ...prev }
        })

        for(let i=0; i< taskJson.task.actions.length; i++){
          
          if (taskJson && taskJson.task) {
            const { command, actionType, thought } = taskJson.task.actions[i]
  
            try {
              if (!taskExecutionRef.current.isTaskActive) break;
  
              if (actionType === 'back') {
                console.log("Going back")
                await chrome.tabs.goBack(tabId)
              } else if (actionType === 'forward') {
                console.log("Going forward")
                await chrome.tabs.goForward(tabId)
              } else if (actionType === 'finish') {
                console.log("----------------------      finished  ------------------------------------------")
              } else if (actionType === 'scanning-dom' && command.result) {
                console.log("-------     Result --:", command.result)
                setInfo((prev) => {
                  return prev.slice().concat(JSON.stringify(command.result))
                })
              } else {
                console.log(thought, "The command", command)
                const id = parseInt(command.id as string)
                const objectId = await getObjectId(id, tabId);
                console.log("Unique id", objectId, command)
  
                if (!objectId) {
                  setTasksList((prev) => {
                    return prev.slice().concat(["Didn't find the object id for though:" + thought])
                  })
                  continue;
                };
  
                if (!taskExecutionRef.current.isTaskActive) break;
  
                if (actionType === 'click') {
                  console.log("Going to click")
                  if (command.target === "_blank") {
                    console.error("Command target _blank")
                  } else {
                    await domClick(tabId, objectId)
                  }
  
                } else if (actionType === 'typing' && typeof command.textToType === 'string') {
                  await setValue(tabId, objectId, command.textToType)
  
                } else {
                  console.log("!!!!!!!!!!!!!!!!!!!!Something is wrong with this command!!!!!!!1111", command, thought, actionType)
                }
              }
  
              taskExecutionRef.current = {
                ...taskExecutionRef.current,
                aboutPreviousTask: taskExecutionRef.current.aboutPreviousTask.slice().concat([thought])
              }
  
              if (!taskExecutionRef.current.isTaskActive) break;
  
              if (command.tag === 'a') {
                console.log("Sleeping for 2 sec")
                setTasksList((prev) => {
                  return prev.slice().concat([thought, "sleeping for 2 sec"])
                })
                await sleep(2000)
              } else {
                console.log("Sleeping for 2 sec")
                setTasksList((prev) => {
                  return prev.slice().concat([thought, "sleeping for 2 sec"])
                })
                await sleep(2000)
              }
              console.log("task", i, "  done", thought)
  
            } catch (err) {
              console.error("in command", command, thought, err)
              setTasksList((prev) => {
                return prev.slice().concat([`got error executing last command: "${thought}"`])
              })
            }
            // }
  
            // console.log("got commands", tasks)
          }
        }
        // taskJson.task.actions

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

  }, [tabId, main_task, apiKeys, setTaskState])

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
            sleep(2000).finally(() => {
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


// async function executeAction(main_task: string, apiKey: string, tabId: number) {
//   try {
//     console.log("Executing prompt")

//     await attachDebugger(tabId)

//     const compact_dom = await getSimplifiedDom()
//     const taskJson = await sendDomGetCommand(apiKey, { main_task, compact_dom: compact_dom.outerHTML }, [])

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