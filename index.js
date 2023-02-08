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
    try{
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
    
    const coolDown = [{}]
    for(const c of JSON.parse(await fs.readFile('./json/channels.json', 'UTF-8'))){
        coolDown[0][c]= []
    }

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
                if(!coolDown[0][channel.slice(1)].includes(user)){
                    const firstPrompt = `\nUser: Hola soy ${user}, Quien eres?\nAI: Hola ${user}, Yo soy un bot creado por Piero y estoy conversando en el canal de ${channel.slice(1)} en twitch.\nUser: Cual es tu nombre o como me puedo referirte a ti?\nAI: Yo soy Pieront, asi puedes referirte a mi.\nUser: Quien es Piero?\nAI: El es un simple viewer de ${channel}, y en sus ratos libre programa.\nUser: Por que estas en el canal de ${channel}?\nAI: Estoy aqui para disfrutar el contenido del Streamer ${channel}.\nUser: Puedes interactuar en el canal de ${channel}?\nAI: Lamentablemente no puedo interactuar en el canal, solo estoy aqui para reacionar y responder.\nUser: Tengo un historial de esta conversacion?\nAI: Si, tu historial de esta conversacion se guarda y se borra cada 5 horas o si los caracters supera los 5 mil.\nUser: Puedo tenerlo, mi historial?\nAI: Tu historail se encuentra aqui https://api.kala-vods.com/v1/logs/${channel.slice(1)}/${user}.\nUser: Puedo ver tu codigo, como estas creado?\nAI: Mi codigo es open source y se puede encontrar en https://github.com/piero0920/pieront-bot.`
                    const bodyPrompt = await Redis.get(`BOT:${channel}:${user}`)
                    const userPrompt = `\nUser: ${text.slice(9)}`
                    let isRepeated = false
                    let currentPrompt = ''
                    if(bodyPrompt === null){
                        await Redis.setEx(`BOT:${channel}:${user}`, 60 * 60 * 5, firstPrompt + userPrompt)
                        currentPrompt = firstPrompt + userPrompt
                    }else{
                        if(bodyPrompt.split('\n').at(-2) === userPrompt.trim()){
                            isRepeated = true
                        }
                        currentPrompt = bodyPrompt + userPrompt
                    }
                    if(!isRepeated){
                        const response = await askOpenAI(currentPrompt, user)
                        if(response.length){
                            const userTTL = await Redis.TTL(`BOT:${channel}:${user}`)
                            await Redis.setEx(`BOT:${channel}:${user}`, parseInt(userTTL) ,currentPrompt+response)
                            const cleanResponse = response.slice(response.indexOf('AI: ')+4)
                            chatClient.say(channel, user+' '+cleanResponse)
                            if(response.length > 5000){
                                await Redis.del(`BOT:${channel}:${user}`)
                            }
                        }else{
                            chatClient.say(channel, user+' escribi Bien OOOO')
                        }
                    }else{
                        chatClient.say(channel, user+' para el spam MYAAA')
                    }

                    coolDown[0][channel.slice(1)].push(user)
                    setTimeout(() => {
                        coolDown[0][channel.slice(1)] = coolDown[0][channel.slice(1)].filter(u => u !== user);
                    }, (10 * 1000))
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
            if(botRe.test(text) && !(user == chatClient.currentNick) && !text.includes('@')){
                const shouldEmote = await Redis.get('BOT:shouldEmote')
                if(shouldEmote === null || shouldEmote !== 'no'){
                    const is_live = (await helixApi.streams.getStreamsByUserNames(['KalathrasLolweapon']))[0]
                    if(is_live === undefined){
                        await Redis.setEx('BOT:shouldEmote', 60 * 10, 'no')
                    }
                }else{
                    const emotes = JSON.parse(await fs.readFile('./json/emotes.json', 'UTF-8'))
                    const random = Math.floor(Math.random() * emotes.length);
                    chatClient.say(channel, emotes[random])
                }
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
