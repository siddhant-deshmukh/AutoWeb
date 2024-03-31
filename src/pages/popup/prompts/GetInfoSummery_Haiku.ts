import Anthropic from "@anthropic-ai/sdk";

export default async function GetInfoSummery_Sonnet({ claude, command, compact_dom }: {
  claude: Anthropic,
  command: any,
  compact_dom: string,
}) {
  try {
    const system_prompt = `
    You are an AI assistant skilled at parsing HTML DOM structures and extracting relevant information based on user commands. 
    You will be provided with a compact DOM representation of a webpage and a specific command to extract data. 
    
    You will then process the DOM, dentify the requested section, present the requested information in JSON format. 
    
    Give output only under 2000 words try to give important details only.
    `
    const user_prompt = `
    command:  ${JSON.stringify(command)}
    
    

    COMPACT_DOM:  ${compact_dom}
    `


    const version = 'claude-3-haiku-20240307'

    console.log("Sended commad to haiku")
    const completion = await claude.messages.create({
      model: version,
      system: system_prompt.trim(),
      messages: [
        { role: 'user', "content": user_prompt.trim() },
      ],
      max_tokens: 2000,
      temperature: 0.6,
    });
    console.log("Got result Completion", completion)

    if (completion.content.length < 1 || completion.content[0].type !== "text") {
      throw "Got invalid format"
    }
    return { data: completion.content[0].text, msg: 'successful', usage: completion.usage }

  } catch (err) {
    console.error("Get Info Summery and Selected Elements from Haiku", err)
    if (err instanceof Anthropic.APIError) {
      return { msg: JSON.stringify(err.cause), err }
    }
    return { msg: "Prompt failed", err }
  }
}