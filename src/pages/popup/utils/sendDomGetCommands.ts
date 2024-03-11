import { OpenAI } from 'openai'
import { CountTokens } from './countToken';

export async function sendDomGetCommand(
  key: string,
  { compact_dom, user_prompt, currentPageUrl }: { compact_dom: string, user_prompt: string, currentPageUrl: string }, aboutPrevTasks: string[]) {
  // const openai = new OpenAIApi(
  //   new Configuration({
  //     apiKey: key,
  //   })
  // );

  const openai = new OpenAI({
    apiKey: key,
    dangerouslyAllowBrowser: true
  });

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
  
  You have a MAIN_TASK that you have to achieve. You will give me a task to perform this MAIN_TASK. 
  At each iteration I will give you current DOM state with what task actions you take previously. 

  Based on this give me task at each iteration. the task that you will give me will contain two part about and command.

  commandTypes: 'click' and 'typing' means click and typing operation to perform in DOM, 'back' and 'forward' means clicking navigation button in chrome i.e going on previous or next page, 'scanning-result' means you scanned the dom and giving some insights like summerizing or giving details if user asked. 

  Do not include any explanations, only provide a  RFC8259 compliant JSON response  following this format without deviation. 
  {
    tasks : [
      {
        about: {A string explaining task, what it does? and reason why are you doing this?. I will send all this as previous actions which will help toward completing MAMAIN_TASKIN_TASK},
        commandType: {either 'typing', 'click', 'back', 'forward', 'scanning-result'},
        command: {
          id: {id number of the selected element },
          tag: {tag of the element like "button", "a"},
          textToType: {in case of wanted to type something write the text here},
          target: {if anchor tag then its target e.g "_blank"},
          result: {in case you wanted to give result give it here in any valid json format}
        }
      }
    ],
    
  }
  please note that in output it should be same HTML tag. I mean you can not give id and tagType of two different tags. Give one task and command at a time

  MAIN_TASK is "${user_prompt}"

  current DOM "${compact_dom}"

  current page url "${currentPageUrl}"

  previous actions you have take "${JSON.stringify(aboutPrevTasks)}"

  The JSON response:
  `

  const token_count = CountTokens(prompt)
  console.log(token_count, '\n\nprompt', prompt)
  if (token_count > 20000) {
    return { msg: 'exceeding token limit', token_count, usage: undefined }
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4-0125-preview', // 'mistralai/Mixtral-8x7B-Instruct-v0.1', //  'gpt-4-0125-preview',
    messages: [
      { role: 'system', "content": "Imagine yourself a chrome browser automater" },
      { role: 'user', content: prompt },
    ],
    max_tokens: 1000,
    temperature: 0,
  });

  // // const completion = await ope.chat.completions.create({
  // //   model: "mistralai/Mistral-7B-Instruct-v0.1",
  // //   messages: [{ "role": "system", "content": "You are a helpful assistant." },
  // //   { "role": "user", "content": prompt }],
  // //   temperature: 0.1,
  // //   stream: true
  // // });

  console.log("Completions", completion, completion.usage)
  let taskstring = completion.choices[0].message?.content

  taskstring = taskstring.replace(/```/g, "")
  taskstring = taskstring.replace('json', "")

  // const taskList = extractCommands(taskstring).map((task) => {
  //   return extractAttributes(task)usage: completion.usage
  // })
  console.log("CHAT_GPT", completion, taskstring)
  const task = JSON.parse(taskstring)
  console.log("tasks", task)

  return { tasks: task.tasks, msg: 'successful', token_count, usage: completion.usage }
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
