import Anthropic from "@anthropic-ai/sdk";

export default async function GetCommands_Sonnet({ claude, summery_selected_elements, main_task, aboutPrevTasks }: {
  claude: Anthropic,
  summery_selected_elements: string,
  main_task: string,
  aboutPrevTasks: string[]
}) : Promise<{
  task: ITask;
  msg: string;
  usage: Anthropic.Messages.Usage;
  err?: undefined;
} | {
  msg: string;
  usage?: Anthropic.Messages.Usage;
  task?: undefined;
  err?: any;
}> {
  try {
    const system_prompt = `
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
            'finish' - If you think MAIN_TASK is complete,
            'stop' - If you think we have lost and MAIN_TASK can not be done,
            'scanning-dom' - Provide insights or Summarize information from the current page example give top x number of or all search results or summarize article, without performing any actions",

          "command": {
            "id": "The unique identifier (e.g., ID or XPath) of the target element, if applicable",
            "tag": "The HTML tag name of the target element, if applicable (e.g., 'button', 'a')",
            "textToType": "The text to be typed into an input field, if applicable",
            "target": "The target attribute value of an anchor tag, if applicable (e.g., '_blank')",
            "search-for": "If the actionType is 'scanning-dom', provide a detail instruction about what detail you want from the original DOM, specifiy valid JSON format required, in which section to search based on the task"
          },
          "action_in_short": "what action is it performing and to do what. Tell in short"
        },
      ]
    }

    When to fill form try to fill only the required elements that are empty.

    Look at previous actions taken; don't repeat those actions. Try an alternative approach if something failed.

    If the purpose of actions is to fill multiple inputs giving more than one action at each iteration is okay. Otherwise give only one action at each iteration. For 'click', 'scanning-dom' give only one action at each iteration.

    Do not repeat PREVIOUS_TASK that are Success.

    Remember, your goal is to suggest actions that will progressively move the user closer to completing the MAIN_TASK, even if the task cannot be accomplished in the current iteration. 

    Please provide clear and concise thoughts and commands, adhering strictly to the specified JSON response format.
    `
    const user_prompt = `
    MAIN_TASK: ${main_task}
      
    PREVIOUS_TASK: ${JSON.stringify(aboutPrevTasks)}

    ${summery_selected_elements}
    `
    const version = 'claude-3-sonnet-20240229'

    const completion = await claude.messages.create({
      model: version,
      system: system_prompt.trim(),
      messages: [
        { role: 'user', "content": user_prompt.trim() },
      ],
      max_tokens: 2000,
      temperature: 0.4,
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
        return { task: data as ITask, msg: 'successful', usage: completion.usage }
      } catch (err) {
        console.error("Failed in JSON parsing while sonnet getting commands", dataJSONstring[0])
        return { msg: 'failed to extract json from sonnet get commands', usage: completion.usage }
      }
    } else {
      return { msg: 'failed to extract data from sonnet get commands', usage: completion.usage }
    }
  } catch (err) {
    console.error("Error while from sonnet get commands", err)
    if (err instanceof Anthropic.APIError) {
      return { msg: JSON.stringify(err.cause), err }
    }
    return { msg: "Prompt failed", err }
  }
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
      'search-for'?: any | null
    },
    action_in_short: string
  }[]
}