import { OpenAI } from 'openai'
import Anthropic from '@anthropic-ai/sdk';
import { CountTokens } from './countToken';

export async function sendDomGetCommand(
  key: string,
  { compact_dom, user_prompt, currentPageUrl }: {
    compact_dom: string,
    user_prompt: string,
    currentPageUrl: string
  },
  aboutPrevTasks: string[]
): Promise<
  { task: undefined, msg: string,       token_count: number, usage?: Anthropic.Usage,  err: false } |
  { task: undefined, msg: string,       token_count?: number, usage?: Anthropic.Usage, err: true } |
  { task: ITask,     msg: 'successful', token_count?: number, usage: Anthropic.Usage, err: false }> {

  try {
    // const openai = new OpenAIApi(
    //   new Configuration({
    //     apiKey: key,
    //   })
    // );

    // const openai = new OpenAI({
    //   apiKey: key,
    //   dangerouslyAllowBrowser: true
    // });

    const claude = new Anthropic({
      apiKey: key,
    })

    // So when I give you a COMMAND and the DOM of website you will tell me instuctions to perform on DOM to execute that COMMAND. You have to tell actions to do inside the DOM to achive this.
    // The output should be a stringified json string that I can later parse easily. Message should be string only json. Dont add backticks please . The format of json should be
    // For now only consider tagTypes of type "button", "a", "li", "div", "span".
    // You will be be given a task to perform and the current state of the DOM. You will also be given previous actions that you have taken.
    // And if to perform the task I have to do more than one command then that is fine.

    // currently on the page "${currentPageUrl}"

    // If you wanted to add some info that MAIN_TASK requires from current page like summerising page or getting some data you can add it in pageInfo array.
    // pageInfo: [
    //   {
    //     ...{Can write in any valid json format whatever fields you like}
    //   }
    // ]
    const prompt = `
  
  Goal is to complete the MAIN_TASK given. Have to do it in iteration.
  At each iteration I will give you current webpage DOM with what thought of tasks you take previously. 
  And you have to give me a single task at each iteration.

  Based on this give me task at each iteration. the task that you will give me will contain parts though, command and commandType.

  commandTypes: 'click' and 'typing' means click and typing operation to perform in DOM, 'back' and 'forward' means clicking navigation button in chrome i.e going on previous or next page, 'finish' means MAIN_TASK is done, 'scanning-result' means you scanned the dom and giving some insights like summerizing or giving details if user asked. 

  Do not include any explanations, only provide a  RFC8259 compliant JSON response following this format within <JSON></JSON> tag without deviation. 
  { 
    task : {
        thought: {A string explaining task, what it does? and reason why are you doing this?. I will send all this as previous actions which will help toward completing MAIN_TASK},
        commandType: {either 'typing', 'click', 'back', 'forward', 'scanning-result'},
        command: {
          id: {id number of the selected element },
          tag: {tag of the element like "button", "a"},
          textToType: {in case of wanted to type something write the text here},
          target: {if anchor tag then its target e.g "_blank"},
          result: {in case you wanted to give result give it here in any valid json format}
        }
      }
  }
  one task at each iteration.
  please note that in output it should be same HTML tag. I mean you can not give id and tagType of two different tags. Give one task and command at a time

  MAIN_TASK is "${user_prompt}"

  current DOM "${compact_dom}"

  current page url "${currentPageUrl}"

  thoughts of previous actions you have take "${JSON.stringify(aboutPrevTasks)}"

  The JSON response:
  `

    const token_count = CountTokens(prompt)
    console.log(token_count, '\n\nprompt', prompt)
    if (token_count > 20000) {
      return { msg: 'exceeding token limit', token_count, usage: undefined, task: undefined, err: false }
    }

    // const completion = await openai.chat.completions.create({
    //   model: 'gpt-3.5-turbo-0125', // 'mistralai/Mixtral-8x7B-Instruct-v0.1', //  'gpt-4-0125-preview',
    //   messages: [
    //     { role: 'system', "content": "Imagine yourself a chrome browser automater" },
    //     { role: 'user', content: prompt },
    //   ],
    //   max_tokens: 1000,
    //   temperature: 0,
    // });

    const completion = await claude.messages.create({
      model: 'claude-3-haiku-20240307', // 'mistralai/Mixtral-8x7B-Instruct-v0.1', //  'gpt-4-0125-preview',
      messages: [
        { role: 'user', content: prompt },
        { role: 'assistant', "content": "Imagine yourself a chrome browser automater" },
      ],
      max_tokens: 1000,
      temperature: 0,
    });

    // console.log("Completions", completion, completion.usage)

    if (completion.content.length < 1 || completion.content[0].type !== "text") {
      throw "Got invalid format"
    }
    var pattern = /<JSON>(.*?)<\/JSON>/s;
    // Use match method to find all matches of the pattern in the text
    var matches = completion.content[0].text.match(pattern);
    // If matches are found, extract the commands
    // console.log("matches", matches)
    if (matches && matches.length > 0) {
      // Remove <command> and </command> tags from each match
      const taskJSONstring = matches.map(function (match) {
        return match.replace(/<\/?JSON>/g, '');
      });
      // console.log(taskJSONstring)
      const tasksJSON = JSON.parse(taskJSONstring[0]) as { task: ITask }

      // console.log("Final", tasksJSON, { tasks: tasksJSON.tasks, msg: 'successful', token_count, usage: completion.usage })
      return { task: tasksJSON.task, msg: 'successful', token_count, usage: completion.usage, err: false }
    } else {
      throw 'Invalid format';
    }

    let taskstring = completion
    // let taskstring = completion.choices[0].message?.content

    // taskstring = taskstring.replace(/```/g, "")
    // taskstring = taskstring.replace('json', "")

    // // const taskList = extractCommands(taskstring).map((task) => {
    // //   return extractAttributes(task)usage: completion.usage
    // // })
    // console.log("CHAT_GPT", completion, taskstring)
    // const task = JSON.parse(taskstring)
    // console.log("tasks", task)

    // return { tasks: task.tasks, msg: 'successful', token_count, usage: completion.usage }
  } catch (err) {
    console.error("While sending Prompt", err)
    return { task: undefined, msg: 'failed', err: true }
  }
}


export function extractAttributes(commandString: string) {
  // Define a pattern to match the id and tagType attributes
  var pattern = /id=(\d+)\s+tagType={"(.*?)"}/;
  // Use match method to find the match of the pattern in the string
  var match = commandString.match(pattern);
  // If a match is found, extract id and tagType
  if (match) {
    var id = parseInt(match[1]); // Parse id as integer
    var tagType = match[2]; // Extract tagType
    return { id: id, tagType: tagType }; // Construct and return the object
  } else {
    return null; // Return null if no match is found
  }
}

export function extractCommands(text: string) {
  // Define the pattern to match commands inside <command></command> tags
  var pattern = /<command>(.*?)<\/command>/g;
  // Use match method to find all matches of the pattern in the text
  var matches = text.match(pattern);
  // If matches are found, extract the commands
  if (matches) {
    // Remove <command> and </command> tags from each match
    return matches.map(function (match) {
      return match.replace(/<\/?command>/g, '');
    });
  } else {
    return [];
  }
}

export interface ITask {
  thought: string,
  commandType: 'click' | 'typing' | 'back' | 'forward' | 'finish' | 'scanning-result',
  command: {
    id?: string | null,
    tag?: string | null,
    textToType?: string | null,
    target?: string | null,
    result?: any | null
  }
}