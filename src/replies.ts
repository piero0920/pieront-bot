import { Channel, IrcMessage } from 'deps'
import { channelDatabase } from 'interfaces'

export function pong(c:Channel, ircmsg: IrcMessage){
    c.send(`Pong! Hi, ${ircmsg.tags['display-name'] ?? ircmsg.username}. ` +
            `I'm currently running on Deno. ${Deno.version.deno} ` +
            `Your chat color is ${ircmsg.tags.color ?? "unknown"}.`)
    console.log('pinged by', ircmsg.username)
}

export function last_vod(c:Channel, ircmsg: IrcMessage, channel_db: channelDatabase){
    console.log('asked last vod by', ircmsg.username)
    const vod_link = 'https://www.twitch.tv/videos/' + channel_db.last_vod
    if(channel_db.channel_name === 'kalathraslolwepaon'){
        c.send('!hug ' + vod_link)
        return
    }else {
        c.send('Ultimo vod: ' + vod_link)
        return
    }
}