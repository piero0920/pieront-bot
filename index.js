import { RefreshingAuthProvider  } from '@twurple/auth';
import { ChatClient } from '@twurple/chat';
import { ApiClient } from '@twurple/api'
import { config } from 'dotenv'
import { promises as fs } from 'fs';
import { Configuration, OpenAIApi } from 'openai'

import Redis from './redis.js'

config()

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

async function askOpenAI(prompt, user){
    const response = await openai.createCompletion({
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
    try{
        return response.data.choices[0].text
    } catch(e) {
        console.log(e)
        return ''
    }
}


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
    const helixApi = new ApiClient({authProvider});
    const chatClient = new ChatClient({ authProvider, channels: JSON.parse(await fs.readFile('./json/channels.json', 'UTF-8')) });
    
    await chatClient.connect();

    chatClient.onMessage(async (channel, user, text, msg) => {
        if(text.startsWith('!!callate ') && user === 'piero_fn'){
            const timeOut = text.split(' ')[1]
            const isNumber = !isNaN(timeOut)
            if(text.split(' ')[2] !== undefined && isNumber && parseInt(timeOut) >= 1){
                const channels = JSON.parse(await fs.readFile('./json/channels.json', 'UTF-8')) 
                chatClient.say(channel, 'vale :/, bye por' + timeOut + 's.')
                for(const c of channels){
                    await Redis.setEx('CALLADO:'+c, parseInt(timeOut) * 60, 'callado')
                }
            }else if(isNumber && parseInt(timeOut) >= 1){
                chatClient.say(channel, 'vale :/, ' + timeOut)
                await Redis.setEx('CALLADO:'+channel, parseInt(timeOut) * 60, 'callado')
            } else{
                chatClient.say(channel, 'escribi Bien OOOO')
            }
        }
        const estaCallado = await Redis.get('CALLADO:'+channel)
        if(estaCallado !== 'callado' || estaCallado === null){
            const atSelf = new RegExp(/^@Pieront /g)
            if(atSelf.test(text)){
                const firstPrompt = `\nUser: Hola soy ${user}, Quien eres?\nAI: Hola ${user}, Yo soy un bot en twitch creado por Piero y estoy conversando en el canal de ${channel.slice(1)}.`
                const bodyPrompt = await Redis.get(`BOT:${channel}:${user}`)
                const userPrompt = `\nUser: ${text.slice(9)}`
                let currentPrompt = ''
                if(bodyPrompt === null){
                    await Redis.set(`BOT:${channel}:${user}`, firstPrompt + userPrompt)
                    currentPrompt = firstPrompt + userPrompt
                }else{
                    currentPrompt = bodyPrompt + userPrompt
                }
                const response = await askOpenAI(currentPrompt, user)
                if(response.length){
                    await Redis.set(`BOT:${channel}:${user}`, currentPrompt+response)
                    const cleanResponse = response.slice(response.indexOf('AI: ')+4)
                    chatClient.say(channel, user+' '+cleanResponse)
                }else{
                    chatClient.say(channel, user+' escribi Bien OOOO')
                }
            }
            if(text.startsWith('!!')){
                if(text === '!!vod'){
                    const channel_id = (await helixApi.users.getUserByName(channel.slice(1))).id
                    const lastVOD = (await helixApi.videos.getVideosByUser(channel_id,{ limit: 1, type: 'archive'})).data[0].url
                    if(channel === '#kalathraslolweapon'){
                        chatClient.say(channel, `!hug ${lastVOD}`)
                    }else{
                        chatClient.say(channel, `${user}, UTLIMO VOD: ${lastVOD}`)
                    }
                }
            }
            const botRe = new RegExp(/piero/g)
            if(botRe.test(text) && !(user == chatClient.currentNick)){
                const emotes = JSON.parse(await fs.readFile('./json/emotes.json', 'UTF-8'))
                const random = Math.floor(Math.random() * emotes.length);
                chatClient.say(channel, emotes[random])
            }
        }else{
            const atSelf = new RegExp(/^@Pieront /g)
            if(atSelf.test(text)){
                const exp = await Redis.TTL('CALLADO:'+channel)
                chatClient.say(channel, `toy callado :/ por ${exp} s`)
            }
        }
    });

}

main();
