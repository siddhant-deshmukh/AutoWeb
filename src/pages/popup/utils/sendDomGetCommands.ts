import {
  Configuration,
  OpenAIApi
} from 'openai'

export async function sendDomGetCommand(key: string, { compact_dom, user_prompt }: { compact_dom: string, user_prompt: string }, aboutPrevTasks: string[]) {
  const openai = new OpenAIApi(
    new Configuration({
      apiKey: key,
    })
  );
  
  // So when I give you a COMMAND and the DOM of website you will tell me instuctions to perform on DOM to execute that COMMAND. You have to tell actions to do inside the DOM to achive this.
  // The output should be a stringified json string that I can later parse easily. Message should be string only json. Dont add backticks please . The format of json should be
  // For now only consider tagTypes of type "button", "a", "li", "div", "span".
  // You will be be given a task to perform and the current state of the DOM. You will also be given previous actions that you have taken.
  
  const prompt = `
  
  You have a MAIN_TASK that you have to achieve. You will give me a task or multiple task to perform this MAIN_TASK. 
  At each iteration I will give you current DOM state with what task actions you take previously. 
  
  Based on this give me task at each iteration. the task that you will give me will contain two part about and command.

  Do not include any explanations, only provide a  RFC8259 compliant JSON response  following this format without deviation. 
  {
    tasks : [
      {
        about: {a string telling what the command. include what the command prpose and what elemeent it is selecting and why.},
        commandType: {either 'typing', 'click', 'finish' showing the type of command is either clicking or typing or task is finished},
        command: {
          id: {id number of the selected element },
          tag: {tag of the element like "button", "a"},
          textToType: {in case of wanted to type something write the text here}
        }
      }
    ]
  }
  please note that in output it should be same HTML tag. I mean you can not give id and tagType of two different tags. And if to perform the task I have to do more than one command then that is fine.

  MAIN_TASK is "${user_prompt}"

  current DOM "${compact_dom}"

  previous actions you have take "${JSON.stringify(aboutPrevTasks)}"

  The JSON response:
  `

  console.log('prompt', prompt)
  
  const completion = await openai.createChatCompletion({
    model: 'gpt-4-0125-preview',
    messages: [
      { role: 'system', "content": "Imagine yourself a chrome browser automater" },
      { role: 'user', content: prompt },
    ],
    max_tokens: 500,
    temperature: 0,
  });

  let taskstring = completion.data.choices[0].message?.content

  taskstring = taskstring.replace(/```/g, "")
  taskstring = taskstring.replace('json', "")

  // const taskList = extractCommands(taskstring).map((task) => {
  //   return extractAttributes(task)
  // })
  console.log("CHAT_GPT", completion, taskstring)
  const task = JSON.parse(taskstring)
  console.log("tasks", task)

  return task
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
