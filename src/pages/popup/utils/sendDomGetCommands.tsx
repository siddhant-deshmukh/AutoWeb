import {
  Configuration,
  OpenAIApi
} from 'openai'

export async function sendDom(key: string, dom: string) {
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

  now the COMMAND is "open new repository"

  and the DOM of the website is "${dom}"
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

  console.log( "CHAT_GPT", completion)
}