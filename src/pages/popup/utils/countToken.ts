// import { Tiktoken, encoding_for_model } from 'tiktoken'


// const encoding = encoding_for_model('gpt-4-0125-preview')

// export function CountTokens(prompt: string){
//   const token_count = encoding.encode(prompt).length
//   return token_count
// }

export function CountTokens(prompt: string){
  return Math.floor(prompt.length * 0.4)
}

export function CountTokensFromResponse(){

}