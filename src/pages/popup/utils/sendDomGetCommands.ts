import { OpenAI } from 'openai'
import Anthropic from '@anthropic-ai/sdk';
import { CountTokens } from './countToken';

export async function sendDomGetCommand(
  key: string,
  { compact_dom, main_task, currentPageUrl }: {
    compact_dom: string,
    main_task: string,
    currentPageUrl: string
  },
  aboutPrevTasks: string[]
): Promise<{ task?: ITask, msg: string, token_count?: number, usage?: Anthropic.Usage, err: any }> {

  try {
    // const openai = new OpenAI({
    //   apiKey: key,
    //   dangerouslyAllowBrowser: true,
    // });

    const claude = new Anthropic({
      apiKey: key,
    })
    const assistant_prompt = "Imagine your self as browser automater. Give me a RFC8259 compliant valid json output inside <JSON></JSON> tags otherwise it will be invalid"

    //* Step 1 : (Haiku)  Getting summery of web page

    const user_prompt_01_get_summery = `
    Your input is a DOM of webpage
    
    Give following points as output:
    1. summery: main purpose of webpage and what is it showing
    2. section_patterns: try to find repetative patterns, sections named them and tell in short what it represent
    3. Operations that can be done: what operations can we do in this webpage, also scan buttons and roles
    4. total number of nav links in the page
    5. total number of inputs in the page
    7. top 10 input. 10 only. Only give their label or any description as string
    
     Give output in following format. Try to use as less world as possible.
     {
      "summery": {},
      "sections_patterns": {},
      "operations that can be done": [],
      "total-nav-links": ,
      "total-inputs": ,
      "inputs": [],
     }
      
      current page URL: "${currentPageUrl}"

      DOM: "${JSON.stringify(compact_dom)}"
      break;
      `
    const output01 = await SendPromptToClaude({
      claude,
      version: 'claude-3-haiku-20240307',
      assistant_prompt: 'You are a webpage DOM pattern identifier. Give me a RFC8259 compliant valid json output inside <JSON></JSON> tags otherwise it will be invalid.',
      user_prompt: user_prompt_01_get_summery,
      max_tokens: 600,
      temperature: 0.4
    })
    console.log("-------- 1. Summerizing data complete", output01)
    if (!output01.data) {
      return { err: output01.err, msg: output01.msg, token_count: output01.token_count }
    }
    const summery = output01.data

    //* Step 2 : (Sonnet) Getting next task of web page 

    //description_of_DOM_elements_needed: ""
    // Don't be too specific like className, aria-label just give basic text elements that can be found in DOM. 
    const get_dom_retrival_prompt_prompt = `
    Giving you MAIN_TASK that has to be done in multiple tasks, history of tasks previously taken, summery of the current web page.

    Output the next potential task. And inclue keywords to look into DOM. Can give more than one potential_task. Only think about next immediate single step. this is about one task only. 
    Remember that what you are looking for might not be here and might have to some thing like getting nav-links, searching and getting result inorder to move ahead.

    { potential_task: [{ potential_next_step: "", to_do_what_task: "", keywords: [] }] }

    MAIN_TASK: "${main_task}"

    Previously taken tasks: "${JSON.stringify(aboutPrevTasks)}"
    
    page summery "${JSON.stringify(summery)}"
    `
    const output02 = await SendPromptToClaude({
      claude,
      version: 'claude-3-sonnet-20240229',
      user_prompt: get_dom_retrival_prompt_prompt,
      assistant_prompt,
      max_tokens: 600,
      temperature: 0.6,
    })
    console.log("-------- 2. Getting task", output02)
    if (!output02.data) {
      return { err: output02.err, msg: output02.msg, token_count: output02.token_count }
    }
    const retreval_data_info = output02.data


    //* Step 3 : (Haiku) Retriving DOM data
    const get_retrived_DOM_prompt = `
    Output: 
    [{
      "potential_next_step": "",
      "DOM_element_needed":""
    }]
    Give seperate DOM for each potential_task. In case of search give possible form and submit button.

    potential_task: : ${JSON.stringify(retreval_data_info)}

    entire DOM:"${compact_dom}"
    `
    const output03 = await SendPromptToClaude({
      claude,
      version: 'claude-3-haiku-20240307',
      user_prompt: get_retrived_DOM_prompt,
      assistant_prompt: "Imagine your self as DOM retrieval which will give me small portion of DOM needed to perform potential tasks. Give me a valid json output inside <JSON></JSON> tags otherwise it will be invalid",
      max_tokens: 700,
      temperature: 0.8,
    })
    console.log("-------- 3. Retriving DOM complete", output03)
    if (!output03.data) {
      return { err: output03.err, msg: output03.msg, token_count: output03.token_count }
    }
    const retrived_dom = output03.data

    //* Step 4 : (Sonnet) Final getting commands
    const get_commands_prompt = `
    Giving you MAIN_TASK that has to be done in multiple tasks, history of tasks previously taken, a short version of original DOM called retrived_dom.

    Give me a single task at each iteration.
    Choose any element from the retrived_dom and explain what to do with it in following format.
    Output fields: 
    1. thought: A string explaining what command does? Its role towards achieving main task
    2. command : {
      id: {id number of the selected element },
      tag: {tag of the element like "button", "a"},
      textToType: {in case of wanted to type something write the text here},
      target: {if anchor tag then its target e.g "_blank"},
      result: {in case you wanted to give result give it here in any valid json format}
    }
    3. commandType: 'typing' | 'click' | 'back' | 'forward' | 'scanning-result' | 'failed'


    commandTypes explained: 
    'click' and 'typing' means click and typing operation to perform in DOM, 
    'back' and 'forward' means clicking navigation button in chrome i.e going on previous or next page, 
    'finish' means MAIN_TASK is done, 'failed' means didn't find any correct operation to do from retrived_dom
    'scanning-result' means you scanned the dom and giving some insights e.g summerizing the page, giving some data  
    

    Output JSON format:
    { 
      task : {
          thought: "",
          commandType: "",
          command: {
            id: ,
            tag: "",
            textToType?: "",
            target?: "",
            result?: ""
          }
        }
    }
    note that in output it should be same HTML tag. I mean you can not give id and tagType of two different tags. Give one task and command at a time

    MAIN_TASK is "${main_task}"

    retrived_dom "${JSON.stringify(retrived_dom)}"

    current page url "${currentPageUrl}"

    thoughts of previous actions taken "${JSON.stringify(aboutPrevTasks)}"
    `
    const output04 = await SendPromptToClaude({
      claude,
      version: 'claude-3-sonnet-20240229',
      user_prompt: get_commands_prompt,
      assistant_prompt,
      max_tokens: 500,
      temperature: 0.4,
    })
    console.log("-------- 4. Final Task", output04)
    if (!output04.data) {
      return { err: output04.err, msg: output04.msg, token_count: output04.token_count }
    }
    const final_commands = output04.data

  } catch (err) {
    console.error("While sending Prompt", err)
    return { task: undefined, msg: 'failed', err: true }
  }
}



export async function SendPromptToClaude({ claude, version, user_prompt, assistant_prompt, max_tokens = 500, temperature = 0.2 }: {
  version: 'claude-3-sonnet-20240229' | 'claude-3-haiku-20240307',
  claude: Anthropic,
  user_prompt: string,
  assistant_prompt: string,
  max_tokens?: number,
  temperature?: number
}): Promise<{ data?: any, msg: string, token_count?: number, usage?: Anthropic.Usage, err?: any }> {
  try {
    const token_count = CountTokens(user_prompt)
    // console.log(token_count, '\n\nprompt', prompt)
    if (token_count > 20000) {
      return { msg: 'exceeding token limit', token_count }
    }
    console.log({ user_prompt, assistant_prompt })
    const completion = await claude.messages.create({
      model: version,
      messages: [
        { role: 'user', content: user_prompt },
        { role: 'assistant', "content": assistant_prompt },
      ],
      max_tokens,
      temperature,
    });
    console.log("Completion", completion)
    if (completion.content.length < 1 || completion.content[0].type !== "text") {
      throw "Got invalid format"
    }
    var pattern = /<JSON>(.*?)<\/JSON>/s;
    var matches = completion.content[0].text.match(pattern);
    if (matches && matches.length > 0) {

      const dataJSONstring = matches.map(function (match) {
        return match.replace(/<\/?JSON>/g, '');
      });
      try {
        const data = JSON.parse(dataJSONstring[0]) //as { task: ITask }
        return { data, msg: 'successful', token_count, usage: completion.usage }
      } catch (err) {
        console.error("Failed in JSON parsing")
        return { data: dataJSONstring[0], msg: 'successful', token_count, usage: completion.usage }
      } 
       
    } else {
      return { msg: 'failed to extract data', token_count, usage: completion.usage }
    }
  } catch (err) {
    console.error("While sending prompt to claude", err, { user_prompt, version })
    if (err instanceof Anthropic.APIError) {
      return { msg: JSON.stringify(err.cause), err }
    }
    return { msg: "Prompt failed", err }
  }
}




export async function SendPromptToGPT({ openai, version, user_prompt, system_prompt, max_tokens = 1000, temperature = 0.2 }: {
  version: 'gpt-4-0125-preview' | 'gpt-3.5-turbo-0125',
  openai: OpenAI,
  user_prompt: string,
  system_prompt: string,
  max_tokens?: number,
  temperature?: number
}) {
  const token_count = CountTokens(user_prompt)
  // console.log(token_count, '\n\nprompt', user_prompt)
  if (token_count > 20000) {
    return { task: undefined, msg: 'exceeding token limit', token_count, usage: undefined, err: false }
  }

  const completion = await openai.chat.completions.create({
    model: version,
    messages: [
      { role: 'system', "content": system_prompt },
      { role: 'user', content: user_prompt },
    ],
    max_tokens,
    temperature,
  })

  let taskstring = completion.choices[0].message?.content

  taskstring = taskstring.replace(/```/g, "")
  taskstring = taskstring.replace('json', "")

  const task = JSON.parse(taskstring)
  return { tasks: task.tasks, msg: 'successful', token_count, usage: completion.usage }
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