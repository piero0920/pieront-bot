import { TwitchChat, Channel } from 'deps'
import config from 'app/src/config.ts'
import db from 'app/src/database.ts'
import { pong, last_vod } from 'app/src/replies.ts'

const client = new TwitchChat(config.TWITCH_BOT_TOKEN, config.TWITCH_BOT_USERNAME)

export async function listenChannel(c: Channel) {
    for await (const ircmsg of c) {
        const channel_db = db.channel_db.get(c.channelName)
        if(!channel_db){
            console.log('Error getting channel Database')
            return
        } 
        switch (ircmsg.command) {
            case "PRIVMSG":
                if(ircmsg.message == '!ping'){
                    pong(c, ircmsg)
                    return
                }
                if(ircmsg.message == '!vod'){
                    last_vod(c, ircmsg, channel_db)
                    return
                }
        }
    }
}

export default client