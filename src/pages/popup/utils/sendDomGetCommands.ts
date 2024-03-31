import Anthropic from '@anthropic-ai/sdk';
import GetSummerySelectedElements_Haiku from '../prompts/GetSummerySelectedElements_Haiku';
import GetCommands_Sonnet, { ITask } from '../prompts/GetCommands_Sonnet';
import GetInfoSummery_Sonnet from '../prompts/GetInfoSummery_Haiku';

export async function sendDomGetCommand(
  keys: { openai: string, claude: string },
  { compact_dom, main_task, currentPageUrl }: {
    compact_dom: string,
    main_task: string,
    currentPageUrl: string
  },
  aboutPrevTasks: string[]
): Promise<{ task?: ITask, msg: string, usage?: { haiku: Anthropic.Usage, sonnet: Anthropic.Usage }, err?: any }> {

  try {
    const claude = new Anthropic({
      apiKey: keys.claude,
    })


    const { summery_selected_elements, err: err01, usage: usage01 } = await GetSummerySelectedElements_Haiku({ claude, main_task, currentPageUrl, compact_dom })
    if (!summery_selected_elements) {
      throw err01
    }
    const { task, err: err02, usage: usage02, msg } = await GetCommands_Sonnet({ claude, aboutPrevTasks, main_task, summery_selected_elements, currentPageUrl })
    if (!task) {
      throw err02
    }

    for(let i=0;i < task.actions.length; i++){
      const { actionType, command } = task.actions[i]
      if(actionType === 'scanning-dom'){
        const { data } = await GetInfoSummery_Sonnet({ claude, command: command["search-for"], compact_dom })
        task.actions[i].command['search-for'] = JSON.stringify(data)
      }
    }

    return { msg: 'successful', task, usage: { haiku: usage01, sonnet: usage02 } }
  } catch (err) {
    console.error("While sending Prompt", err)
    return { task: undefined, msg: 'failed', err: true }
  }
}
