import { AIBot, OpenAI } from 'deps'
import { CONFIG, local_config } from 'app/src/config.ts'

const pieront = new AIBot({
    name: CONFIG.TWITCH_BOT_USERNAME,
    instruction: local_config.globalPrompt
})

const openai = new OpenAI(CONFIG.OPENAI_API_KEY);

export async function chatOpenAI(msg:ChatCompletionMessage[], user:string){
    console.log('chat with ', user)
    const response = await openai.createChatCompletion({
        model: CONFIG.OPENAI_CHAT_MODEL,
        messages: msg,
    })

    try {
        const chatResponse: chatOpenAIResponse = {
            success: true,
            tokens: response.usage.total_tokens,
            msg: response.choices[0].message as ChatCompletionMessage
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

export {
    pieront
}