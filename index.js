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
    if(response.data.error !== undefined){
        return ''
    }
    return response.data.choices[0].text
    
}

async function chatOpenAI(msg, user){
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
        return {
            tokens: response.data.usage.total_tokens,
            msg: response.data.choices[0].message
        }
    }catch {
        console.log(response.data.error)
        return {
            tokens: 0,
            msg: ''
        }
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
    
    const promptLen = 100 // conversation len
    const tokenLen = 2500 // total token usage
    const promptTTL = 5 //hours
    const coolDown = [{}]
    const emotes = [{}]
    for(const c of JSON.parse(await fs.readFile('./json/channels.json', 'UTF-8'))){
        coolDown[0][c] = []
        emotes[0][c] = []
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
                return
            }else if(isNumber && parseInt(timeOut) >= 1){
                chatClient.say(channel, 'vale :/, ' + timeOut)
                await Redis.setEx('CALLADO:'+channel, parseInt(timeOut) * 60, 'callado')
                return
            } else{
                chatClient.say(channel, 'escribi Bien OOOO')
                return
            }
        }
        const cacheEmotes = await Redis.get('CHATBOT:EMOTES:'+channel)
        if(cacheEmotes == null){
            const channel_id = await helixApi.users.getUserByName(channel.slice(1))
            const channel_emotes = await helixApi.chat.getChannelEmotes(channel_id.id)
            for(const emote of channel_emotes){
                if(emote.tier && emote.tier.toString().startsWith("1")){
                    emotes[0][channel.slice(1)] += emote.name + ' '
                }
            }
            await Redis.setEx('CHATBOT:EMOTES'+ channel, 60 * 60 * promptTTL, emotes[0][channel.slice(1)])
        }
        
        const estaCallado = await Redis.get('CALLADO:'+channel)
        if(estaCallado !== 'callado' || estaCallado === null){
            const atSelf = new RegExp(/^@Pieront /g)
            if(atSelf.test(text)){
                if(!coolDown[0][channel.slice(1)].includes(user)){
                    if(text.toLowerCase() === '@pieront olvidame'){
                        await Redis.del(`BOT:${channel}:${user}`)
                        chatClient.say(channel, user + 'tu historial se ha borrado y te he olvidado.')
                        return
                    }
                    const firstMsg = {
                        role: "system",
                        content: `Eres un chatbot llamado Pieront, que se encuentra en el canal de ${channel.slice(1)} en twitch, tu creador es piero. Vas a hacer roleplay de alguien tranquilo y que responde subjectivamente con respuestan politicamente incorrectas, quedate en personaje.`
                    }              
                    const firstPrompt = `\nUser: Hola soy ${user}, Quien eres?\nAI: Hola ${user}, Yo soy un bot creado por Piero y estoy conversando en el canal de ${channel.slice(1)} en twitch.\nUser: Cual es tu nombre o como me puedo referirte a ti?\nAI: Yo soy Pieront, asi puedes referirte a mi.\nUser: Quien es Piero?\nAI: El es un simple viewer de ${channel}, y en sus ratos libre programa.\nUser: Por que estas en el canal de ${channel}?\nAI: Estoy aqui para disfrutar el contenido del Streamer ${channel}.\nUser: Puedes interactuar en el canal de ${channel}?\nAI: Lamentablemente no puedo interactuar en el canal, solo estoy aqui para reacionar y responder.\nUser: Tengo un historial de esta conversacion?\nAI: Si, tu historial de esta conversacion se guarda y se borra cada ${promptTTL} horas o si los caracters supera los ${promptLen}.\nUser: Puedo tenerlo, mi historial?\nAI: Tu historail se encuentra aqui https://api.kala-vods.com/v1/logs/${channel.slice(1)}/${user}.\nUser: Puedo ver tu codigo, como estas creado?\nAI: Mi codigo es open source y se puede encontrar en https://github.com/piero0920/pieront-bot.`
                    const bodyPrompt = await Redis.get(`BOT:${channel}:${user}`)
                    const fullMsg = await Redis.get(`BOT:${channel}:${user}`)
                    const userPrompt = `\nUser: ${text.slice(9)}`
                    const userMsg = {
                        role: "user",
                        content: text.slice(9)
                    }
                    let isRepeated = false
                    let currentPrompt = ''
                    let currentMsg = []
                    if(fullMsg == null){
                        const cacheEmotes = await Redis.get('CHATBOT:EMOTES' + channel)
                        const emoteMsg = {
                            role: "system",
                            content: "Agrega estos emotes del canal a algunas de tus respuestas, " + cacheEmotes
                        }
                        currentMsg.push(firstMsg, userMsg)
                        await Redis.setEx(`BOT:${channel}:${user}`, 60 * 60 * promptTTL, JSON.stringify(currentMsg))
                    }else{
                        if(JSON.parse(fullMsg).at(-2) == userMsg){
                            isRepeated = true
                        }
                        currentMsg.push(...JSON.parse(fullMsg), userMsg)
                    }
                    if(!isRepeated){
                        const response = await chatOpenAI(currentMsg, user)
                        console.log(currentMsg)
                        console.log(response.tokens)
                        if(response.msg){
                            currentMsg.push(response.msg)
                            const userTTL = await Redis.TTL(`BOT:${channel}:${user}`)
                            await Redis.setEx(`BOT:${channel}:${user}`, parseInt(userTTL), JSON.stringify(currentMsg))

                            const cleanResponse = response.msg.content.trim()
                            chatClient.say(channel, user+' '+cleanResponse)
                            if(currentMsg.length > promptLen){
                                await Redis.del(`BOT:${channel}:${user}`)
                                chatClient.say(channel, user+' historial limpiado.')
                            }
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
                if(text.toLowerCase() === '!!vod'){
                    const channel_id = (await helixApi.users.getUserByName(channel.slice(1))).id
                    const lastVOD = (await helixApi.videos.getVideosByUser(channel_id,{ limit: 1, type: 'archive'})).data[0].url
                    if(channel === '#kalathraslolweapon'){
                        chatClient.say(channel, `!hug ${lastVOD}`)
                        return
                    }else{
                        chatClient.say(channel, `${user}, UTLIMO VOD: ${lastVOD}`)
                        return
                    }
                }
                if(text.toLowerCase() === '!!ttl' || text.toLowerCase().split(' ')[1].startsWith('@')){
                    const cmd = text.split(' ')
                    if(cmd.length === 1){
                        const ttl = await Redis.TTL(`BOT:${channel}:${user}`)
                        const ttlTime = new Date(ttl * 1000).toISOString().slice(11, 19)
                        if(ttl > 1){
                            const prompt = await Redis.get(`BOT:${channel}:${user}`)
                            chatClient.say(channel, `${user} ttl: ${ttlTime}, len: ${JSON.parse(prompt).length}/${promptLen}.`)
                        }else {
                            chatClient.say(channel, `${user} no pude encontrar tu TTL`)
                        }
                    }else if(cmd.length === 2 && cmd[1].startsWith('@')){
                        const ttl = await Redis.TTL(`BOT:${channel}:${cmd[1].slice(1).toLowerCase()}`)
                        const ttlTime = new Date(ttl * 1000).toISOString().slice(11, 19)
                        if(ttl > 1){
                            const prompt = await Redis.get(`BOT:${channel}:${cmd[1].slice(1)}`)
                            chatClient.say(channel, `${user} ttl: ${ttlTime}, len: ${JSON.parse(prompt).length}/${promptLen}.`)
                        }else {
                            chatClient.say(channel, `${user} no pude encontrar el TTL de ${cmd[1].slice(1)}`)
                        }
                    }
                }
            }
            const botRe = new RegExp(/piero/g)
            if(botRe.test(text) && !(user == chatClient.currentNick) && !text.includes('@')){
                const shouldEmote = await Redis.get('BOT:shouldEmote')
                if(shouldEmote === null || shouldEmote !== 'no'){
                    const is_live = (await helixApi.streams.getStreamsByUserNames(['KalathrasLolweapon']))[0]
                    if(is_live === undefined){
                        await Redis.setEx('BOT:shouldEmote', 60 * 30, 'no')
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
                chatClient.say(channel, `toy callado :/ por ${exp}s`)
            }
        }
    });

}

main();
