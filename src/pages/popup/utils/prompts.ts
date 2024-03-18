const get_summery_prompt = `
Will give you the DOM. Give me a valid JSON output only otherwise it will be invalid
{
   "summery" : {what does this webpage shows or main purpose of web page},
   "patterns": [Look for patterns that are repetitive. What these pattern represent],
   "operations that can be done": [],
   "nav-links": [{just labels}],
   "inputs": [{just labels}],
}`

const get_next_task_prompt = `
Given: 
 1. MAIN_TASK that has to be done in multiple tasks 
 2. history of tasks previously take
 3. summery of the current web page

Output:
only think about next immediate single step. this about one task only. Output valid JSON otherwise will be invalid.
{
  possiblities: [
  {
potential_next_step: "",
description_of_DOM_elements_needed: {},
}
]
}
`

const get_dom_elements = `

`


function main_prompt(){
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
    const user_prompt = ""
    const compact_dom = ""
    const currentPageUrl = ""
    const aboutPrevTasks = []
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
}