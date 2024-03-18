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

    const user_prompt_01_get_summery = `Will give you the DOM. 
      Give output in following format. Try to use as less world as possible. Don't want output exceed 400 tokens.
      {
        "summery" : {what does this webpage shows or main purpose of web page},
        "patterns": [Look for patterns that are repetitive. What these pattern represent],
        "operations that can be done": [],
        "total-nav-links": ,
        "total-inputs": ,
        "inputs": [{just labels} maximum 10],
        "nav-links": [{just labels} maximum 15],
      }
      
      page URL: "${currentPageUrl}"

      DOM: "${JSON.stringify(compact_dom)}"
      `
    const output01 = await SendPromptToClaude({
      claude,
      version: 'claude-3-haiku-20240307',
      assistant_prompt,
      user_prompt: user_prompt_01_get_summery,
      max_tokens: 500,
      temperature: 0.2
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
    Giving you MAIN_TASK that has to be done in multiple tasks, history of tasks previously take, summery of the current web page

    Output the next posible task. And inclue keywords to look into DOM. Can give more than one possiblities. Only think about next immediate single step. this is about one task only.
    {
      possiblities: [{
        potential_next_step: "",
      }]
    }
    
    MAIN_TASK: "${main_task}"

    Previously taken tasks: "${JSON.stringify(aboutPrevTasks)}"
    
    Current web page summery "${JSON.stringify(summery)}"
    `
    const output02 = await SendPromptToClaude({
      claude,
      version: 'claude-3-sonnet-20240229',
      user_prompt: get_dom_retrival_prompt_prompt,
      assistant_prompt,
      max_tokens: 600,
      temperature: 0.6,
    })
    console.log("-------- 2. Summerizing data complete", output02)
    if (!output02.data) {
      return { err: output02.err, msg: output02.msg, token_count: output02.token_count }
    }
    const retreval_data_info = output02.data


    //* Step 3 : (Haiku) Retriving DOM data
    const get_retrived_DOM_prompt = `
    You are supposed to retrieve some element from entire DOM.
    Giving you entire dom and description of some elements that I want from that DOM. Only give the elements that match the description.
    Output pattern:
    {
      retrived_elements: [
        {DOM}
      ]
    }

    description of desired elements: ${JSON.stringify(retreval_data_info)}

    entire DOM:"${compact_dom}"
    `
    const output03 = await SendPromptToClaude({
      claude,
      version: 'claude-3-haiku-20240307',
      user_prompt: get_retrived_DOM_prompt,
      assistant_prompt,
      max_tokens: 700,
      temperature: 0.3,
    })
    console.log("-------- 3. Retriving DOM complete", output03)
    if (!output03.data) {
      return { err: output03.err, msg: output03.msg, token_count: output03.token_count }
    }
    const retrived_dom = output03.data

    
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
      const data = JSON.parse(dataJSONstring[0]) //as { task: ITask }

      return { data, msg: 'successful', token_count, usage: completion.usage }
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