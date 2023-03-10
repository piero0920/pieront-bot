import config from 'app/src/config.ts';
import { Configuration, OpenAIApi, ChatCompletionRequestMessage  } from 'deps'
import { chatOpenAIResponse } from 'interfaces'

const configuration = new Configuration({
    apiKey: config.API_KEY,
});

const openai = new OpenAIApi(configuration);

export async function chatOpenAI(msg:ChatCompletionRequestMessage[], user:string){
    console.log('chat with ', user)
    const response = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: msg,
        temperature: 1.8,
        max_tokens: 75,
        frequency_penalty: 1,
        presence_penalty: 1,
        user: user,
    })
    try {
        const chatResponse: chatOpenAIResponse = {
            success: true,
            status_text: response.statusText,
            tokens: response.data.usage?.total_tokens,
            msg: response.data.choices[0].message
        }
        return chatResponse
    }catch {
        const chatResponse: chatOpenAIResponse = {
            success: false,
            status_text: response.statusText,
            tokens: 0,
            msg: undefined
        }
        return chatResponse
    }
}
