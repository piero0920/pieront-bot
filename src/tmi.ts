import { TwitchChat, Channel } from 'deps'
import { CONFIG } from 'app/src/config.ts'
import replies from 'app/src/replies.ts'

const TMI_CLIENT = new TwitchChat(CONFIG.TWITCH_BOT_TOKEN, CONFIG.TWITCH_BOT_USERNAME)

function capitalize(str: string){
    return str[0].toUpperCase() + str.slice(1)
}
function getRandom(max = 100){
    return Math.floor(Math.random() * max)
}

const bot_regex = new RegExp(`^@${capitalize(CONFIG.TWITCH_BOT_USERNAME)} `)
const mod_regex = new RegExp(` ${CONFIG.TWITCH_BOT_MOD.split('_')[0]} `)

export async function listenChannel(c: Channel) {
    console.log('Listing tmi for', c.channelName)
    for await (const ircmsg of c) {
        
        const random1 = getRandom()
        const random2 = getRandom()
        
        switch (ircmsg.command) {
            case "PRIVMSG":
                if(ircmsg.message == '!ping'){
                    replies.pong(c, ircmsg)
                }
                if(ircmsg.message == '!vod'){
                    replies.last_vod(c, ircmsg)
                }
                if(bot_regex.test(ircmsg.message)){
                    await replies.chat_with_bot(c, ircmsg)
                }
                if(random1 % random2 === 0 || ircmsg.message == '!a' || mod_regex.test(ircmsg.message)){
                    await replies.random_emote(c)
                }
                if(ircmsg.message == '!aa' || ircmsg.username){
                    await replies.randomMsg(c, ircmsg)
                }
                if(ircmsg.message == '!!anime'){
                    await replies.tellMeThatAnime(c, ircmsg)
                }
                
                // Testing
                if(ircmsg.message == '!!song' && ircmsg.username == CONFIG.TWITCH_BOT_MOD){
                    await replies.tellMeThatSong(c, ircmsg)
                }
        }
    }
}

export {
    TMI_CLIENT
}