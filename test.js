import { RefreshingAuthProvider  } from '@twurple/auth';
import { ChatClient } from '@twurple/chat';
import { ApiClient } from '@twurple/api'
import { promises as fs } from 'fs';

import { config } from 'dotenv'
import { Configuration, OpenAIApi } from 'openai'
config()

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);
async function askOpenAI(prompt, user){
    const response = await openai.chat({
        model: "text-davinci-003",
        prompt: prompt,
        temperature: 0.9,
        max_tokens: 100,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0.6,
        user: user,
        stop: [" User:", " AI:"],
    });
    console.log(response.data)
}

async function chatOpenAI(msg, user){
    const response = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: msg,
        temperature: 0.9,
        top_p: 1,
        max_tokens: 100,
        frequency_penalty: 0,
        presence_penalty: 0.6,
        user: user,
    })
    try {
        return {
            tokens: response.data.usage.total_tokens,
            msg: response.data.choices[0].message
        }
    }catch(e) {
        console.log(e.message)
        console.log(response.data)
        return {
            tokens: 0,
            msg: ''
        }
    }
}



const messages = [
    {
        role: "system",
        content: "Eres un chat bot en el canal de endnatsu, ayudaras como puedas respondiendo todo, tu creador es piero."
    }
]

messages.push({
    role: "user",
    content: "Hola!"
})


async function main() {

    const tokenData = JSON.parse(await fs.readFile('./json/tokens.json', 'UTF-8'));
    const authProvider = new RefreshingAuthProvider(
        {
            clientId: process.env.TWITCH_CLIENT_ID,
            clientSecret: process.env.TWITCH_CLIENT_SECRET,
            onRefresh: async newTokenData => await fs.writeFile('./json/tokens.json', JSON.stringify(newTokenData, null, 4), 'UTF-8')
        },
        tokenData
    );
    const a = [{}]

    a[0]["a"]=[]
    const helixApi = new ApiClient({authProvider});
    const channel = await helixApi.users.getUserByName("piero_fn")
    const emotes = await helixApi.chat.getChannelEmotes(channel.id)
    for(const emote of emotes){
        if(emote.tier && emote.tier.toString().startsWith("1")){
            a[0]["a"] += emote.name + ' '
        }
    }
    console.log(a[0]["a"])
}

const a = []
const b = {
    "a": "a"
}
const c = {
    "b": "b"
}

a.push(b,c)
console.log(a.at(-1) == c)