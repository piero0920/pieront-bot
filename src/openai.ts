import config from 'app/src/config.ts';
import { OpenAI, ChatCompletionOptions  } from 'deps'
import { chatOpenAIResponse } from 'interfaces'


const openai = new OpenAI(config.OPENAI_API_KEY);

export async function chatOpenAI(msg:ChatCompletionOptions["messages"], user:string){
    console.log('chat with ', user)
    const response = await openai.createChatCompletion({
        model: "gpt-4",
        messages: msg,
    })
    try {
        const chatResponse: chatOpenAIResponse = {
            success: true,
            tokens: response.usage.total_tokens,
            msg: response.choices[0].message
        }
        return chatResponse
    }catch {
        const chatResponse: chatOpenAIResponse = {
            success: false,
            tokens: 0,
            msg: undefined
        }
        return chatResponse
    }
}
