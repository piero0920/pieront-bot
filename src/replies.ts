import { Channel, IrcMessage } from 'deps'
import { getChannel, getBot } from 'app/src/redis.ts'
import { pieront, chatOpenAI } from 'app/src/openai.ts'
import { CONFIG, local_config } from 'app/src/config.ts'
import { BuildStreamURL, downloadImage, getAnimeData, downloadAudio, getSongData } from 'app/src/api.ts'

function pong(c: Channel, ircmsg: IrcMessage){
    console.log('pinged by', ircmsg.username)

    c.send(`Pong! Hi, ${ircmsg.tags['display-name'] ?? ircmsg.username}. ` +
            `I'm currently running on Deno. ${Deno.version.deno} ` +
            `Your chat color is ${ircmsg.tags.color ?? "unknown"}.`)
}

async function last_vod(c: Channel, ircmsg: IrcMessage){
    console.log('asked last vod by', ircmsg.username)
    const channel = await getChannel(c.channelName)
    const vod_link = 'https://www.twitch.tv/videos/' + channel.last_vod

    if(channel.last_vod === "0"){
        c.send('No encontre vods.')
        return
    }else if(channel.channel_name === 'kalathraslolwepaon'){
        c.send('!hug ' + vod_link)
        return
    }else {
        c.send('Ultimo vod: ' + vod_link)
        return
    }
}

function getUserPrompt(ircmsg: IrcMessage){
    return ircmsg.message.slice(CONFIG.TWITCH_BOT_USERNAME.length)
}

async function build_first_msg(ircmsg: IrcMessage){
    const bot = await getBot()

    const first_msg: ChatCompletionMessage[] = [
        {   
            name: ircmsg.username,
            role: "user",
            content: `Eres ${bot.bot_channel_name} y ${bot.global_prompt}`
        },
        {
            name: CONFIG.TWITCH_BOT_USERNAME,
            role: 'assistant',
            content: 'Entiendo.'
        }
    ]
    return first_msg 
}

async function chat_with_bot(c: Channel, ircmsg: IrcMessage){
    const msg = getUserPrompt(ircmsg)
    const user_id = ircmsg.tags['user-id']
    
    if(!pieront.sessions.has(user_id)){
        const first_msg = await build_first_msg(ircmsg)
        pieront.sessions.set(user_id, {
            messages: first_msg,
            timestamps: [ Date.now() ]
        })
    }
    
    const response = await pieront.ask(msg, {
        chatId: user_id,
        userName: ircmsg.username,
        model: CONFIG.OPENAI_CHAT_MODEL
    })

    const send_msg = `${ircmsg.username} ${response.trim()}`
    c.send(send_msg)
    return
}

async function random_emote(c: Channel){
    const channel = await getChannel(c.channelName)
    const bot = await getBot()

    const emotes = []
    
    emotes.push(...channel.tv_emotes, ...channel.bttv_emotes, ...channel.ztv_emotes, ...bot.global_emotes)

    const random = Math.floor(Math.random() * emotes.length)

    if(!channel.is_live){
        c.send(emotes[random])
    }
}

async function randomMsg(c: Channel, ircmsg: IrcMessage){
    const channel = await getChannel(c.channelName)

    if(ircmsg.username !== CONFIG.TWITCH_BOT_MOD || ircmsg.message !== "!aa"){        
        if(channel.is_live) return
        const random_1 = Math.floor(Math.random() * 100);
        const random_2 = Math.floor(Math.random() * 100);
        if(random_1 % random_2 !== 0) return
    }

    const response = await chatOpenAI(local_config.randomMsg, "random")
    console.log(response)
    if(!response.success) return
    if(!response.msg) return
    c.send(response.msg.content)
}

async function tellMeThatAnime(c: Channel, ircmsg: IrcMessage){
    console.log('Anime request by', ircmsg.username)
    
    const channel = await getChannel(c.channelName)

    if(!channel.is_live){
        c.send(`${ircmsg.username} ${channel.channel_name} no esta en directo.`)
        return
    }

    const start = new Date()

    const m3u8_url = await BuildStreamURL(channel.channel_name)

    if(!m3u8_url){
        c.send(`${ircmsg.username} toy de lado, no encontre la m3u8 playlist.`)
        console.log("no m3u8 url")
        return
    }

    await downloadImage(m3u8_url.href, channel.channel_name)

    const data = await getAnimeData(channel.channel_name)

    if(!data || !data?.result.length){
        c.send(`${ircmsg.username} toy lento, recivi un error, MYAAA.`)
        console.log("no data", data)
        return
    }

    const anime = data?.result[0]

    if(!anime){
        c.send(`${ircmsg.username} toy lento, o no se esta viendo algun anime.`)
        return
    }

    let send_msg = `El nombre del anime es ${anime.anilist.title.romaji || anime.anilist.title.native || anime.anilist.title.english}.`

    if(anime.episode){
        send_msg += ` Episodio ${anime.episode}.`
    }

    const end = new Date()
    const taked = end.valueOf() - start.valueOf()
    const takedInSeconds = taked / 1000

    c.send(`${ircmsg.username} ${send_msg}`)
    console.log('The requested animed took', takedInSeconds, 's')
}

async function tellMeThatSong(c: Channel, ircmsg: IrcMessage){
    console.log('Song request by', ircmsg.username)

    const channel = await getChannel(c.channelName)

    if(!channel.is_live){
        c.send(`${ircmsg.username} ${channel.channel_name} no esta en directo.`)
        return
    }

    const start = new Date()

    const m3u8_url = await BuildStreamURL(channel.channel_name)

    if(!m3u8_url){
        c.send(`${ircmsg.username} toy de lado, no encontre la m3u8 playlist.`)
        console.log("no m3u8 url")
        return
    }

    await downloadAudio(m3u8_url.href, channel.channel_name)

    const data = await getSongData(channel.channel_name)

    if(!data || data.result == null){
        c.send(`${ircmsg.username} toy lento, recivi un error, MYAAA.`)
        console.log("no data", data)
        return
    }

    const song  = data?.result

    if(!song){
        c.send(`${ircmsg.username} toy lento, o no se escucha una cancion.`)
        return
    }

    let send_msg = `La cancion es ${song.title} por ${song.artist}.`

    if(ircmsg.message.includes("link")){
        send_msg += ` El link es ${song.song_link}`
    }

    const end = new Date()
    const taked = end.valueOf() - start.valueOf()
    const takedInSeconds = taked / 1000

    c.send(`${ircmsg.username} ${send_msg}`)

    console.log('The requested song took', takedInSeconds, 's')
}

export default {
    pong,
    last_vod,
    chat_with_bot,
    random_emote,
    randomMsg,
    tellMeThatAnime,
    tellMeThatSong
}