import { OpenAI } from 'openai'
import Anthropic from '@anthropic-ai/sdk';
import { CountTokens } from './countToken';

export async function sendDomGetCommand(
  keys: { openai: string, claude: string },
  { compact_dom, main_task, currentPageUrl }: {
    compact_dom: string,
    main_task: string,
    currentPageUrl: string
  },
  aboutPrevTasks: string[]
): Promise<{ task?: ITask, msg: string, token_count?: number, usage?: Anthropic.Usage, err: any }> {

  try {
    // const openai = new OpenAI({
    //   apiKey: keys.openai,
    //   dangerouslyAllowBrowser: true,
    // });
    const claude = new Anthropic({
      apiKey: keys.claude,
    })
    // const system_prompt = "Imagine your self as browser automater. Give me a RFC8259 compliant valid json output inside <JSON></JSON> tags otherwise it will be invalid"

    //* Step 1 : (Haiku)  Getting summery and selective elements of web page

    const user_prompt_01_filter_dom = `
    You are an AI assistant designed to analyze a compressed DOM structure and identify the relevant elements required for potential tasks on a web page. The compressed DOM(COMPACT_DOM) will be provided to you

    First scan the whole DOM try to identify different sections of the page and their purpose. Think what could be the next immediate thing to be done to complete the MAIN_TASK. First you may have to click on dropdown, apply filter, search for something as the MAIN_TASK may not be possible with current DOM.
    
    You will need to return relevant DOM containing the following elements:
    
    0. Summery: Summery of the web page what its main prupose is. And this web page show. What are different Sections displaying different info. Keep it short max 500 words.
    
    1. Selected_Elements: If the task involves selecting/summerizing/getting some info and it is present in some DOM sections/list. Give first few elements from the section/list. for example top 3 opinion articles, 5 recent tweets, return only the number of elements that occur first from DOM. In case number not specified return only first element. Return only if element seems relevant. Inside. Note don't give excessive info try understanding DOM relate it with MAIN_TASK and output. 
    
    2. Dropdown_Elements: Might have to click on Dropdown return possible Dropdowns including parent element. 
    3. Search_Form_Elements: Might have to search return possible Search forms
    4. Filter_Input_Elements: Might have to filter search results return relevant Filter input elements 
    5. Navigation_Elements: Might have to click on a button to switch tab or click on navigation link Write these elements DOM inside
    
    Output Format: 
    <Answer>
     <Summery>{text max 500 words}</Summery>
    
    {in the following tag write info in array of string of elements outerHTML example 
     <Type_Elements>
        [
          {
            DOM: "outerHTML of DOM",
            Thought: "Why choosing this element"
          },
        ]
     </Type_Elements>
    }
    <Dropdown_Elements></Dropdown_Elements>
    <Search_Form_Elements></Search_Form_Elements>
    <Filter_Input_Elements></Filter_Input_Elements>
    <Navigation_Elements></Navigation_Elements>
    <Selected_Elements></Selected_Elements>
    </Answer>
    
    Please note that you should not perform any actions on the DOM or attempt to complete the MAIN_TASK itself. Your role is strictly to identify and return the relevant elements based on the provided instructions.
    
    If there are no relevant elements found for a particular category (e.g., no dropdown menus), include an empty array or object for that category in your response.
    `
    const output01 = await SendPromptToClaude({
      claude,
      version: 'claude-3-haiku-20240307',
      system_prompt: user_prompt_01_filter_dom,
      user_prompt: `
      <MAIN_TASK>
        ${main_task}
      </MAIN_TASK>
      
      <URL>
        ${currentPageUrl}
      </URL>
      
      <COMPACT_DOM>
        ${compact_dom}
      </COMPACT_DOM>
      
      `,
      isJson: false,
      max_tokens: 2024,
      temperature: 0.9
    })
    console.log("-------- 1. Summerizing data complete", output01)
    if (!output01.data) {
      return { err: output01.err, msg: output01.msg, token_count: output01.token_count }
    }
    const summery = output01.data

    //* Step 2 : (Sonnet) Final getting commands
    const get_commands_prompt = `
    You are a specialized AI assistant designed to help automate browser tasks by analyzing the current state of a web page and providing actionable steps to achieve a given main task. Your goal is to iteratively guide the user towards completing the main task by suggesting appropriate actions to perform on the web page.
    You will be provided with the following information:

    1. MAIN_TASK: A description of the overall task to be accomplished, such as "Buy a toothbrush from amazon.in" or "Perform a Google search for 'AI art' and return the top 3 image result URLs."

    2. selective_dom: A XML representation of the relevant elements and attributes extracted from the current web page's DOM. This selective DOM structure may include elements such as dropdowns, search forms, filters, and a limited number of specific elements (e.g., the first 3 product reviews or search results).

    3. page_summary: A brief summary of the current web page's content and purpose.

    4. current_url: The URL of the current web page.

    5. previous_actions: A list of actions taken in previous iterations, including the thought process behind each action and any resulting updates to the DOM or page state.

    Your task is to analyze the provided information and suggest a sequence of actions to be performed on the current web page, with the goal of progressing towards completing the MAIN_TASK. Your response should be a valid RFC8259-compliant JSON object with the following structure inside <JSON></JSON> tag:

    {
      "actions": [
        {
          "thought": "A concise explanation of the thought process behind the suggested action(s), including why these actions are necessary and what they aim to achieve.",
          "actionType": "One of the following values:
            'typing' - Type text into an input field or textarea on the current page,
            'click' - Click or interact with a specific element on the current page,
            'back' - Navigate to the previous page in the browser history,
            'forward' - Navigate to the next page in the browser history,
            'scanning-dom' - Provide insights or summarize information from the current page, without performing any actions",
          "command": {
            "id": "The unique identifier (e.g., ID or XPath) of the target element, if applicable",
            "tag": "The HTML tag name of the target element, if applicable (e.g., 'button', 'a')",
            "textToType": "The text to be typed into an input field, if applicable",
            "target": "The target attribute value of an anchor tag, if applicable (e.g., '_blank')",
            "result": "If the actionType is 'scanning-result', provide the requested information or insights here as a valid JSON object"
          },
          "action_in_short": "what action is it performing and to do what. Tell in short"
        },
        {
          "thought": "...",
          "actionType": "...",
          "command": { ... }
        }
      ]
    }

    Look at previous actions taken; don't repeat those actions. Try an alternative approach if something failed.

    If the purpose of actions is to fill a Form or apply filter on multiple inputs giving more than one action at each iteration is okay. Otherwise give only one action at each iteration.

    Do not repeat PREVIOUS_TASK that are Success.

    Remember, your goal is to suggest actions that will progressively move the user closer to completing the MAIN_TASK, even if the task cannot be accomplished in the current iteration. 

    Please provide clear and concise thoughts and commands, adhering strictly to the specified JSON response format.`
    const output02 = await SendPromptToClaude({
      claude,
      version: 'claude-3-sonnet-20240229',
      user_prompt: `
      MAIN_TASK: ${main_task}
      
      PREVIOUS_TASK: ${aboutPrevTasks}

      ${summery}
      `,
      system_prompt: JSON.stringify(get_commands_prompt),
      isJson: true,
      max_tokens: 2000,
      temperature: 0.3,
    })
    console.log("-------- 4. Final Task", output02)
    if (!output02.data) {
      return { err: output02.err, msg: output02.msg, token_count: output02.token_count }
    }
    const final_commands = output02.data
    return { err: output02.err, msg: output02.msg, token_count: output02.token_count, task: final_commands, usage: output02.usage }
    // return final_commands
  } catch (err) {
    console.error("While sending Prompt", err)
    return { task: undefined, msg: 'failed', err: true }
  }
}



export async function SendPromptToClaude({ claude, version, user_prompt, system_prompt, isJson, max_tokens = 500, temperature = 0.2 }: {
  version: 'claude-3-sonnet-20240229' | 'claude-3-haiku-20240307',
  claude: Anthropic,
  user_prompt: string,
  system_prompt: string,
  isJson: boolean,
  max_tokens?: number,
  temperature?: number
}): Promise<{ data?: any, msg: string, token_count?: number, usage?: Anthropic.Usage, err?: any }> {
  try {
    const token_count = CountTokens(user_prompt)
    // console.log(token_count, '\n\nprompt', prompt)
    if (token_count > 20000) {
      return { msg: 'exceeding token limit', token_count }
    }
    console.log({ max_tokens, user_prompt, system_prompt })
    const completion = await claude.messages.create({
      model: version,
      system: system_prompt.trim(),
      messages: [
        { role: 'user', "content": user_prompt.trim() },
        // { role: 'assistant', "content": system_prompt.trim() },
      ],
      max_tokens,
      temperature,
    });
    console.log("Completion", completion)
    if (completion.content.length < 1 || completion.content[0].type !== "text") {
      throw "Got invalid format"
    }
    if (!isJson) {
      return { data: completion.content[0].text, msg: 'successful', token_count, usage: completion.usage }
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
  try {
    console.log({ user_prompt, system_prompt })

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

    // let taskstring = completion.choices[0].message?.content
    console.log(" completion", completion)
    var pattern = /<JSON>(.*?)<\/JSON>/s;
    var matches = completion.choices[0].message.content.match(pattern);
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
    console.error("While sending prompt to openai gpt", err, { user_prompt, version })
    if (err instanceof OpenAI.APIError) {
      return { msg: JSON.stringify(err.cause), err }
    }
    return { msg: "Prompt failed", err }
  }
  // taskstring = taskstring.replace(/```/g, "")
  // taskstring = taskstring.replace('json', "")

  // const task = JSON.parse(taskstring)
  // return { tasks: task.tasks, msg: 'successful', token_count, usage: completion.usage }
}

export interface ITask {
  actions: {
    thought: string,
    actionType: 'click' | 'typing' | 'back' | 'forward' | 'finish' | 'scanning-dom',
    command: {
      id?: string | null,
      tag?: string | null,
      textToType?: string | null,
      target?: string | null,
      result?: any | null
    },
    action_in_short: string
  }[]
}