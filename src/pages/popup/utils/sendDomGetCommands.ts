import {
  Configuration,
  OpenAIApi
} from 'openai'

export async function sendDomGetCommand(key: string, { compact_dom, user_prompt }: { compact_dom: string, user_prompt: string }) {
  const openai = new OpenAIApi(
    new Configuration({
      apiKey: key,
    })
  );

  // The output should be a stringified json string that I can later parse easily. Message should be string only json. Dont add backticks please . The format of json should be
  const prompt = `
  So when I give you a COMMAND and the DOM of website you will tell me instuctions to perform on DOM to execute that COMMAND. You have to tell actions to do inside the DOM to achive this.

  Do not include any explanations, only provide a  RFC8259 compliant JSON response  following this format without deviation. 
  {
    tasks : [
      {
        about: {a string telling what the command do},
        command: {
          id: {id number of the selected element },
          tag: {tag of the element like "button", "a"}
        }
      }
    ]
  }
  please note that in output it should be same HTML tag. I mean you can not give id and tagType of two different tags. For now only consider tagTypes of type "button", "a", "li", "div", "span". And if to perform the task I have to do more than one command then that is fine.

  now the COMMAND is "${user_prompt}"

  and the DOM of the website is "${compact_dom}"

  The JSON response:
  `

  console.log(key, prompt)

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

  console.log("taskString", taskstring)
  taskstring = taskstring.replace(/```/g, "")
  taskstring = taskstring.replace('json', "")

  // const taskList = extractCommands(taskstring).map((task) => {
  //   return extractAttributes(task)
  // })
  console.log("CHAT_GPT", completion, taskstring)
  const task = JSON.parse(taskstring)
  console.log("task", task)

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


/**
 * 
 {
    "id": "chatcmpl-908D0p21pXo90NP8sUB3J63fejEBq",
    "object": "chat.completion",
    "created": 1709818582,
    "model": "gpt-4-0125-preview",
    "choices": [
        {
            "index": 0,
            "message": {
                "role": "assistant",
                "content": "To achieve the command \"list the first and second post and open messages\", you would need to perform the following actions on the DOM:\n\n1. To list the first post, you would interact with the first post's \"More options\" button to potentially reveal options related to the post (like, comment, share, etc.). This is assuming \"listing\" involves interacting with the post in some way. The first post's \"More options\" button is identified by the role \"button\" and id \"474\".\n\n```html\n<command>id={474} tagType={\"button\"} </command>\n```\n\n2. To list the second post, you would interact with the second post's \"More options\" button. The second post's \"More options\" button is identified by the role \"button\" and id \"634\".\n\n```html\n<command>id={634} tagType={\"button\"} </command>\n```\n\n3. To open messages, you would click on the link that opens the messages section. This is identified by the aria-label \"Direct messaging - 1 new notification link\", role \"link\", and id \"294\".\n\n```html\n<command>id={294} tagType={\"a\"} </command>\n```\n\nThese actions would allow you to interact with the first and second posts and then navigate to the messages section of the website."
            },
            "logprobs": null,
            "finish_reason": "stop"
        }
    ],
    "usage": {
        "prompt_tokens": 5892,
        "completion_tokens": 274,
        "total_tokens": 6166
    },
    "system_fingerprint": "fp_00ceb2df5b"
}

 */

/**
 "```html
<task>
  <task_number>1</task_number>
  <about>Like the first post</about>
  <command>
    <id>507</id>
    <tagType>div</tagType>
  </command>
</task>
<task>
  <task_number>2</task_number>
  <about>Open messages</about>
  <command>
    <id>290</id>
    <tagType>a</tagType>
  </command>
</task>
```"
 */