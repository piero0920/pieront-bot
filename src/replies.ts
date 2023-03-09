import { Channel, IrcMessage, ChatCompletionResponseMessage, datetime } from 'deps'
import { channelDatabase, chatBotMsgDatabase, chatOpenAIResponse, cooldown } from 'interfaces'
import db, { saveToDB } from 'app/src/database.ts'
import { chatOpenAI } from 'app/src/openai.ts'

export function pong(c:Channel, ircmsg: IrcMessage){
    console.log('pinged by', ircmsg.username)
    c.send(`Pong! Hi, ${ircmsg.tags['display-name'] ?? ircmsg.username}. ` +
            `I'm currently running on Deno. ${Deno.version.deno} ` +
            `Your chat color is ${ircmsg.tags.color ?? "unknown"}.`)
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

function get_msg_id(ircmsg: IrcMessage, channel_db: channelDatabase){
    return `${channel_db.channel_id}-${ircmsg.tags['user-id']}`
}

function build_first_msg(channel_db: channelDatabase){
    const bot = db.bot_db.get("bot")
    const first_msg:ChatCompletionResponseMessage[] = [
        {
            role: "system",
            content: `Eres ${bot.bot_channel_name} y ${bot.global_prompt}`
        }
    ]
    if(channel_db.local_config.description) {
        first_msg.push({
            role: "system",
            content: channel_db.local_config.description
        })
    }
    if(channel_db.local_config.customPrompt){
        first_msg.push({
            role: "system",
            content: channel_db.local_config.customPrompt
        })
    }
    return first_msg
}

function build_user_msg(ircmsg: IrcMessage){
    const msg = ircmsg.message.slice(9)
    const user_msg:ChatCompletionResponseMessage = {
        role: "user",
        content: msg
    }
    return user_msg
}

function build_first_user(c:Channel, ircmsg: IrcMessage, channel_db: channelDatabase){
    const bot = db.bot_db.get("bot")
    const ttl_time = datetime().add({hour: bot.historial_clean_in }).toMilliseconds()
    const cooldown = channel_db.user_cooldown.find(e=>e.user_id === ircmsg.tags['user-id'])
    let user_cooldown = 0
    if(cooldown){
        user_cooldown = cooldown.cooldown_time
    }
    const user_doc: chatBotMsgDatabase = {
        channel: c.channelName,
        channel_id: channel_db.channel_id,
        user_name: ircmsg.username,
        user_id: ircmsg.tags['user-id'],
        ttl: ttl_time,
        tokens: 0,
        cooldown_time: user_cooldown,
        msgs: []
    }
    return user_doc
}

function get_reminder(channel_db: channelDatabase){
    const bot = db.bot_db.get("bot")
    const reminder:ChatCompletionResponseMessage = {
        role: "system",
        content: "Remenber stay in character " + bot.global_prompt
    }
    if(channel_db.local_config.customPrompt){
        reminder.content += " " + channel_db.local_config.customPrompt
    }
    return reminder
}

function get_reminder_boolean(chats: ChatCompletionResponseMessage[]) {
    const filtered = chats.filter(e=>e.role != "system")
    if(filtered.length % 8 === 0 || filtered.length + 1 % 8 === 0 || filtered.length - 1 % 8 === 0){
        return true
    }else {
        return false
    }

}

async function update_user_msg(user_id: string, chat_response: chatOpenAIResponse, chats: ChatCompletionResponseMessage[]){
    if(chat_response.success && chat_response.tokens){
        const tokens = chat_response.tokens
        const user = db.msg_db.get(user_id)

        user.tokens = tokens
        user.msgs = chats

        await saveToDB(db.msg_db, user_id, user)
    }
}

export async function chat_with_bot(c:Channel, ircmsg: IrcMessage, channel_db: channelDatabase){
    console.log()
    const msg_id = get_msg_id(ircmsg, channel_db)
    const user = db.msg_db.contains(msg_id)
    
    const current_msg: ChatCompletionResponseMessage[] = []
    const user_msg = build_user_msg(ircmsg)
    
    if(user){
        const user_chat = db.msg_db.get(msg_id)
        if(user_chat.msgs.length){
            current_msg.push(...user_chat.msgs, user_msg)
        }else {
            const first_msg = build_first_msg(channel_db)
            current_msg.push(...first_msg, user_msg)
        }
    } else {
        const first_msg = build_first_msg(channel_db)
        current_msg.push(...first_msg, user_msg)
    }

    const is_spam = check_for_double(current_msg, user_msg)

    if(is_spam){
        c.send("MYAAA")
        return
    }

    const response = await chatOpenAI(current_msg, ircmsg.username)

    if(response.success && response.msg){
        const send_msg = `${ircmsg.username} ${response.msg.content.trim()}`
        c.send(send_msg)

        console.log(ircmsg.message)
        console.log(send_msg)

        current_msg.push(response.msg)
        const should_remind = get_reminder_boolean(current_msg)
        
        if(should_remind){
            const reminder = get_reminder(channel_db)
            current_msg.push(reminder)
        }
    }else {
        console.log('Error getting chat response', response.status_text)
    }

    if(user){
        const user_chat = db.msg_db.get(msg_id)
        await update_user_msg(msg_id, response, current_msg)
        await handle_limits(msg_id, user_chat)
    }else {
        const new_user = build_first_user(c,ircmsg,channel_db)
        new_user.tokens = response.tokens || 0
        new_user.msgs = current_msg
        await saveToDB(db.msg_db,msg_id, new_user)
    }
}

function check_for_double(full_msg: ChatCompletionResponseMessage[], user_msg: ChatCompletionResponseMessage){
    const filtered = full_msg.filter(e=>e.role != "system")
    if(filtered.at(-3) == user_msg){
        return true
    }else {
        return false
    }
}

async function cleanMsgs(user_id: string, user: chatBotMsgDatabase){
    user.msgs = []
    await saveToDB(db.msg_db, user_id, user)
}

async function handle_limits(user_id: string, user: chatBotMsgDatabase){
    const bot = db.bot_db.get("bot")
    const filtered = user.msgs.filter(e=>e.role != "system")
    const should_ttl = is_cooled_down(user.ttl)
    console.log(user.tokens, bot.token_limit, filtered.length, bot.historial_limit, !should_ttl)
    if(user.tokens > bot.token_limit){
        await cleanMsgs(user_id,user)
    }
    if(filtered.length > bot.historial_limit){
        await cleanMsgs(user_id,user)
    }
}

function is_cooled_down(cooldown_time: number){
    const cooldown_time_date = datetime(cooldown_time)
    const now = datetime()

    if(cooldown_time_date.isAfter(now)){
        return true
    }else {
        return false
    }

}

async function set_cooldown(cooldown_time: number, user_id: string, user: chatBotMsgDatabase, channel_db: channelDatabase, filtered_cooldown: cooldown[] ){
    user.cooldown_time = cooldown_time
    await saveToDB(db.msg_db, user_id, user)

    filtered_cooldown.push({
        cooldown_time: cooldown_time,
        user_id: user_id,
        user_name: user.user_name
    })
    channel_db.user_cooldown = filtered_cooldown
    await saveToDB(db.channel_db, channel_db.channel_name, channel_db)
}

async function update_cooldown(set: boolean, user_id: string, user: chatBotMsgDatabase, channel_db: channelDatabase){
    const filtered_cooldown = channel_db.user_cooldown.filter(function(e) { return e.user_id !== user.user_id })
    if(set){
        const bot = db.bot_db.get("bot")
        const cooldown_time = datetime().add({second: bot.cooldown_time}).toMilliseconds()
        await set_cooldown(cooldown_time,user_id,user,channel_db,filtered_cooldown)
    }else {
        await set_cooldown(0,user_id,user,channel_db,filtered_cooldown)
    }
}

export async function get_should_chat(ircmsg: IrcMessage, channel_db: channelDatabase){
    const msg_id = get_msg_id(ircmsg, channel_db)
    const user = db.msg_db.contains(msg_id)
    if(channel_db.esta_callado){
        return false
    }
    if(!user){
        return true
    }else {
        const user_chat = db.msg_db.get(msg_id)
        const user_cooldown = channel_db.user_cooldown.find(e=>e.user_id === ircmsg.tags['user-id'])
        if(user_cooldown){
            const cooled_time = is_cooled_down(user_cooldown.cooldown_time)
            await update_cooldown(!cooled_time, msg_id, user_chat, channel_db)
            return cooled_time
        }else {
            return true
        }
    }
}

function get_emotes(channel_db: channelDatabase){
    const emotes: string[] = []
    const bot = db.bot_db.get("bot")
    for(const emote of channel_db.tv_emotes){
        emotes.push(emote)
    }

    for(const emote of channel_db.bttv_emotes){
        emotes.push(emote)
    }

    for(const emote of channel_db.ztv_emotes){
        emotes.push(emote)
    }

    for(const emote of bot.global_emotes){
        emotes.push(emote)
    }
    return emotes
}

export function random_emote(c:Channel, channel_db: channelDatabase){
    const emotes = get_emotes(channel_db)
    const random = Math.floor(Math.random() * emotes.length)
    c.send(emotes[random])
}