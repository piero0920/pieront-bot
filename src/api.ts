import config from 'app/src/config.ts'
import { 
    accessToken, twitchApiError, botDatabase, TwitchUserResponse, 
    TwitchVideoResponse, TwitchStreamResponse, TwitchEmoteResponse,
    bttvEmoteResponse, ztvEmote, validateToken } from 'interfaces'
import db, { saveToDB } from 'app/src/database.ts'
import { datetime } from 'deps'

export async function get_auth_token(){
    const url = new URL('https://id.twitch.tv/oauth2/token')
    url.searchParams.append("client_id", config.TWITCH_CLIENT)
    url.searchParams.append("client_secret", config.TWITCH_SECRET)
    url.searchParams.append("grant_type", "client_credentials")

    const response = await fetch(url, { method: "POST"})
    if(response.ok){
        const token: accessToken = await response.json()
        return token
    }else {
        const error: twitchApiError = await response.json()
        throw error.message
    }
}

export async function validate_auth_token(){
    const bot = db.bot_db.get('bot')
    const url = new URL('https://id.twitch.tv/oauth2/validate')

    const r = await fetch(url, {
        headers: {
            "Authorization": "OAuth " + bot.access_token
        }
    })
    
    if(r.ok){
        const response:validateToken = await r.json()
        return response
    }else {
        const error: twitchApiError = await r.json()
        console.log(error.message)
        return undefined
    }

    
}

export async function update_bot_auth_token(bot: botDatabase){
    const token = await get_auth_token()
    const token_expires_date = datetime().add({second: token.expires_in}).toMilliseconds()
    bot.access_token = token.access_token
    bot.expires_in_date = token_expires_date
    await saveToDB(db.bot_db, 'bot', bot)
}

export async function refresh_auth_token(by_time?: boolean, by_status?: number) {
    const bot = db.bot_db.get("bot")
    if(by_time){
        const token_date = datetime(bot.expires_in_date)
        const one_hour_ago = datetime().subtract({hour: 1})
        if(token_date.isAfter(one_hour_ago)){
            await update_bot_auth_token(bot)
        }
        return
    }else if(by_status === 401){
        await update_bot_auth_token(bot)
        return
    }else {
        await update_bot_auth_token(bot)
        return
    }
}



async function doubleFetch(url: URL){
    let responseFetch;
    let response
    for(let i = 1; i <= 2; i++){
        const bot = db.bot_db.get("bot")
        responseFetch = await fetch(url, {
            headers: {
                'Client-ID'     : config.TWITCH_CLIENT,
                'Authorization' : `Bearer ${bot.access_token}`
            }
        })
        if(responseFetch.ok){
            response = await responseFetch.json()
            break
        }else if(responseFetch.status === 401){
            await refresh_auth_token(false, responseFetch.status)
            continue
        }else {
            const error: twitchApiError = await responseFetch.json()
            throw error.message
        }
        
    }
    return response
}

export async function get_user(username: string) {
    await refresh_auth_token(true)
    const url = new URL('https://api.twitch.tv/helix/users')
    url.searchParams.append("login", username)
    const user: TwitchUserResponse = await doubleFetch(url)
    if(user.data.length){
        return user.data[0]
    }else {
        throw 'Error getting channel for ' + user
    }
}

export async function get_vods(channel_id: string){
    await refresh_auth_token(true)

    const url = new URL('https://api.twitch.tv/helix/videos')
    url.searchParams.append("user_id", channel_id)
    url.searchParams.append("first", "10")
    url.searchParams.append("sort", "time")
    url.searchParams.append("type", "archive")

    const vods: TwitchVideoResponse = await doubleFetch(url)
    if(vods.data.length){
        return vods.data
    }else {
        throw 'Error getting vods for ' + channel_id
    }
}

export async function is_channel_live(channel_id: string){
    await refresh_auth_token(true)
    const url = new URL('https://api.twitch.tv/helix/streams')
    url.searchParams.append('user_id', channel_id)
    
    const stream : TwitchStreamResponse = await doubleFetch(url)
    if(stream){
        if(stream.data.length){
            return true
        }else{
            return false
        }
    }else {
        throw 'Error getting if channel is live for ' + channel_id
    }
}

export async function get_twitch_emotes(channel_id: string){
    await refresh_auth_token(true)

    const url = new URL('https://api.twitch.tv/helix/chat/emotes')
    url.searchParams.append("broadcaster_id", channel_id)

    const emotes: TwitchEmoteResponse = await doubleFetch(url)
    if(emotes.data.length){
        return emotes.data
    }else {
        throw 'Error getting twitch channel emotes for ' + channel_id
    }
}

export async function get_bttv_emotes(channel_id: string) {
    const url = new URL('https://api.betterttv.net/3/cached/users/twitch/'+channel_id)

    const emotesFetch = await fetch(url)
    const emotes:bttvEmoteResponse = await emotesFetch.json()

    if(emotes.sharedEmotes){
        return emotes.sharedEmotes
    }else {
        throw 'Error getting bttv channel emotes for ' + channel_id
    }
}

export async function get_7tv_emotes(channel_id: string){
    const url = new URL(`https://api.7tv.app/v2/users/${channel_id}/emotes`)

    const emotesFetch = await fetch(url)
    const emotes:ztvEmote[] = await emotesFetch.json()
    if(emotes){
        return emotes
    }else {
        throw 'Error getting 7tv channel emotes for ' + channel_id
    }
}