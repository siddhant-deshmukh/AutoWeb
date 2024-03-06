import {
  Configuration,
  OpenAIApi
} from 'openai'

export async function sendDomGetCommand(key: string, { compact_dom, user_prompt } : { compact_dom: string, user_prompt: string }) {
  const openai = new OpenAIApi(
    new Configuration({
      apiKey: key,
    })
  );

  const prompt = `
  Imagine yourself a chrome browser automater

  So when I give you a COMMAND and the DOM of website you will tell me instuctions to perform on DOM to execute that COMMAND. You have to tell actions to do inside the DOM to achive this.

  The output format should be 
  <command>id={number} tagType={"button"}  </command> 

  please note that in output it should be same HTML tag. I mean you can not give id and tagType of two different tags. For now only consider tagTypes of type "button", "a", "li", "div", "span". And if to perform the task I have to do more than one command then that is fine.

  now the COMMAND is "${user_prompt}"

  and the DOM of the website is "${compact_dom}"
  `

  console.log(key, prompt)

  const completion = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'user', content: prompt },
    ],
    max_tokens: 500,
    temperature: 0,
  });

  const taskstring = completion.data.choices[0].message?.content?.trim()
  const taskList = extractCommands(taskstring).map((task)=>{
    return extractAttributes(task)
  })

  console.log("CHAT_GPT", taskList, completion)
  return taskList
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