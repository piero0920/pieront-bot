import { TwitchChat, Channel } from 'deps'
import config from 'app/src/config.ts'
import db from 'app/src/database.ts'
import { pong, last_vod, chat_with_bot, get_should_chat, random_emote } from 'app/src/replies.ts'

const client = new TwitchChat(config.TWITCH_BOT_TOKEN, config.TWITCH_BOT_USERNAME)

function capitalize(str: string){
    return str[0].toUpperCase() + str.slice(1)
}

const bot_regex = new RegExp(`^@${capitalize(config.TWITCH_BOT_USERNAME)} `)
const mod_regex = new RegExp(` ${config.TWITCH_BOT_MOD.split('_')[0]} `)

export async function listenChannel(c: Channel) {
    console.log('Listing tmi for', c.channelName)
    for await (const ircmsg of c) {
        const channel_db = db.channel_db.get(c.channelName)
        if(!channel_db){
            console.log('Error getting channel Database')
            return
        }
        // arregla esto MYAAA, pto suenio peepoRun
        const should_chat = true //await get_should_chat(ircmsg, channel_db)
        
        const random1 = Math.floor(Math.random() * 100);
        const random2 = Math.floor(Math.random() * 100); 
        
        switch (ircmsg.command) {
            case "PRIVMSG":
                if(ircmsg.message == '!ping'){
                    pong(c, ircmsg)
                    return
                }
                if(ircmsg.message == '!vod' && should_chat){
                    last_vod(c, ircmsg, channel_db)
                    return
                }
                if(bot_regex.test(ircmsg.message) && should_chat){
                    await chat_with_bot(c,ircmsg,channel_db)
                    return
                }
                if(mod_regex.test(ircmsg.message) && should_chat){
                    random_emote(c,channel_db)
                    return
                }
                if(random1 % random2 === 0){
                    random_emote(c, channel_db)
                    return
                }
        }
    }
}

export default client