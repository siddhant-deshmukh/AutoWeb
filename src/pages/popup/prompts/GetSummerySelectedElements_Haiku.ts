import Anthropic from "@anthropic-ai/sdk";

export default async function GetSummerySelectedElements_Haiku({ claude, compact_dom, main_task, currentPageUrl }: {
  claude: Anthropic,
  compact_dom: string,
  main_task: string,
  currentPageUrl: string
}) {
  try {
    const system_prompt = `
    You are an AI assistant designed to analyze a compressed DOM structure and identify the relevant elements required for potential tasks on a web page. The compressed DOM(COMPACT_DOM) will be provided to you

    First scan the whole DOM try to identify different sections of the page and their purpose. Think what could be the next immediate thing to be done to complete the MAIN_TASK. First you may have to click on dropdown, apply filter, search for something as the MAIN_TASK may not be possible with current DOM.
    
    You will need to return relevant DOM containing the following elements:
    
    0. Summery: Summery of the web page what its main prupose is. And this web page show. What are different Sections displaying different info. Keep it short max 500 words.
    
    1. Dropdown_Elements: Might have to click on Dropdown return possible Dropdowns including parent element. 
    2. Search_Form_Elements: Might have to search return possible Search forms
    3. Filter_Input_Elements: Might have to filter search results return relevant Filter input elements 
    4. Navigation_Elements: Might have to click on a button to switch tab or click on navigation link Write these elements DOM inside
    5. Form_Elements: This elements are different from search and filter. Could be of different types of inputs, select, checkbox. Also mentioned which of them are required and their current value. 
    6. Selected_Elements: If the task involves selecting/summerizing/getting some info and it is present in some DOM sections/list. Give first few elements from the section/list. for example top 3 opinion articles, 5 recent tweets, return only the number of elements that occur first from DOM. In case number not specified return only first element. Return only if element seems relevant. Inside. Note don't give excessive info try understanding DOM relate it with MAIN_TASK and output. 
    
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
    <Form_Elements></Form_Elements>
    <Selected_Elements></Selected_Elements>
    </Answer>
    
    Please note that you should not perform any actions on the DOM or attempt to complete the MAIN_TASK itself. Your role is strictly to identify and return the relevant elements based on the provided instructions.
    
    If there are no relevant elements found for a particular category (e.g., no dropdown menus), include an empty array or object for that category in your response.
    `
    const user_prompt = `
    <MAIN_TASK>
      ${main_task}
    </MAIN_TASK>

    <URL>
      ${currentPageUrl}
    </URL>

    <COMPACT_DOM>
      ${compact_dom}
    </COMPACT_DOM>
    `

    const version = 'claude-3-haiku-20240307'

    console.log("Sended commad to haiku")
    const completion = await claude.messages.create({
      model: version,
      system: system_prompt.trim(),
      messages: [
        { role: 'user', "content": user_prompt.trim() },
      ],
      max_tokens: 2500,
      temperature: 0.9,
    });
    console.log("Got result Completion", completion)

    if (completion.content.length < 1 || completion.content[0].type !== "text") {
      throw "Got invalid format"
    }
    return { summery_selected_elements: completion.content[0].text, msg: 'successful', usage: completion.usage }

  } catch (err) {
    console.error("Get Info Summery and Selected Elements from Haiku", err)
    if (err instanceof Anthropic.APIError) {
      return { msg: JSON.stringify(err.cause), err }
    }
    return { msg: "Prompt failed", err }
  }
}