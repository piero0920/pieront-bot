import config from 'app/src/config.ts';
import { Configuration, OpenAIApi, ChatCompletionRequestMessage  } from 'deps'
import { chatOpenAIResponse } from 'interfaces'

const configuration = new Configuration({
    apiKey: config.API_KEY,
});

const openai = new OpenAIApi(configuration);

export async function chatOpenAI(msg:ChatCompletionRequestMessage[], user:string){
    const response = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: msg,
        temperature: 0.9,
        top_p: 1,
        max_tokens: 50,
        frequency_penalty: 0,
        presence_penalty: 0.6,
        user: user,
    })
    try {
        const chatResponse: chatOpenAIResponse = {
            tokens: response.data.usage?.completion_tokens,
            msg: response.data.choices[0].message
        }
        return chatResponse
    }catch {
        const chatResponse: chatOpenAIResponse = {
            tokens: 0,
            msg: undefined
        }
        return chatResponse
    }
}