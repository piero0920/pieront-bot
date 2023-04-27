import { datetime, fs, path } from 'deps'
import { CONFIG } from 'app/src/config.ts'
import { saveBot, getBot } from 'app/src/redis.ts'

const DECODER = new TextDecoder()
const MEDIA_PATH = "media"
await fs.ensureDir(MEDIA_PATH)

export async function get_auth_token(){
    const url = new URL('https://id.twitch.tv/oauth2/token')
    url.searchParams.append("client_id", CONFIG.TWITCH_CLIENT)
    url.searchParams.append("client_secret", CONFIG.TWITCH_SECRET)
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

export async function update_bot_auth_token(bot: botDatabase){
    const token = await get_auth_token()
    const token_expires_date = datetime().add({second: token.expires_in}).toMilliseconds()
    bot.access_token = token.access_token
    bot.expires_in_date = token_expires_date
    await saveBot(bot)
}

export async function refresh_auth_token(by_time?: boolean, by_status?: number) {
    const bot = await getBot()
    if(by_time){
        const token_date = datetime(bot.expires_in_date)
        const one_hour_ago = datetime().subtract({hour: 1})
        if(token_date.isAfter(one_hour_ago)){
            await update_bot_auth_token(bot)
        }
        return
    }else if(by_status === 401 || by_status === 429){
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
        const bot = await getBot()
        responseFetch = await fetch(url, {
            headers: {
                'Client-ID'     : CONFIG.TWITCH_CLIENT,
                'Authorization' : `Bearer ${bot.access_token}`
            }
        })
        if(responseFetch.ok){
            response = await responseFetch.json()
            break
        }else if(responseFetch.status === 401 || responseFetch.status === 429){
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
        return []
        //throw 'Error getting vods for ' + channel_id
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
        return []
        //throw 'Error getting twitch channel emotes for ' + channel_id
    }
}

export async function get_bttv_emotes(channel_id: string) {
    const url = new URL('https://api.betterttv.net/3/cached/users/twitch/'+channel_id)

    const emotesFetch = await fetch(url)
    const emotes: bttvEmoteResponse = await emotesFetch.json()

    if(emotes.sharedEmotes){
        return emotes.sharedEmotes
    }else {
        return []
        //throw 'Error getting bttv channel emotes for ' + channel_id
    }
}

export async function get_7tv_emotes(channel_id: string){
    const url = new URL(`https://api.7tv.app/v2/users/${channel_id}/emotes`)

    const emotesFetch = await fetch(url)
    const emotes:ztvEmote[] = await emotesFetch.json()
    if(emotes){
        return emotes
    }else {
        return []
        //throw 'Error getting 7tv channel emotes for ' + channel_id
    }
}

export async function BuildStreamURL(channel:string){
    const BodyQuery = JSON.stringify({
        operationName: "PlaybackAccessToken",
        extensions: {
            persistedQuery: {
                version: 1,
                sha256Hash: "0828119ded1c13477966434e15800ff57ddacf13ba1911c129dc2200705b0712"
            }
        },
        variables: {
            isLive: true,
            login: channel,
            isVod: false,
            vodID: "",
            playerType: "embed"
        }
    })
    const Resp = await fetch("https://gql.twitch.tv/gql", {
        method: "POST",
        headers: {
            "Client-ID": "kimne78kx3ncx6brgo4mv6wki5h1ko",
            "Authorization": `OAuth ${CONFIG.TWITCH_OAUTH}`,
            'Content-Type': 'application/json',
        },
        body: BodyQuery
    })
    if(!Resp.ok) {
        const error = await Resp.json()
        console.log("error getting url", error)
        return 
    }
    const VideoResponse:videoPlaybackAccessToken = await Resp.json()
    const live_url = new URL(`https://usher.ttvnw.net/api/channel/hls/${channel}.m3u8`)
    live_url.searchParams.append("client_id", "kimne78kx3ncx6brgo4mv6wki5h1ko")
    live_url.searchParams.append("token", VideoResponse.data.streamPlaybackAccessToken.value)
    live_url.searchParams.append("sig", VideoResponse.data.streamPlaybackAccessToken.signature)
    live_url.searchParams.append("allow_source", "true")
    live_url.searchParams.append("fast_bread", "true")
    live_url.searchParams.append("player_backend", "mediaplayer")
    live_url.searchParams.append("playlist_include_framerate", "true")

    return live_url
}

export async function getSongData(channel: string){
    const formData = new FormData();
    const fileData = await Deno.readFile(path.join(MEDIA_PATH,`${channel}.mp3`));
    
    formData.append("api_token", CONFIG.AUUD_API_TOKEN);
    formData.append("file", new Blob([fileData]), `${channel}.mp3`);
    
    const response = await fetch("https://api.audd.io/", { method: "POST", body: formData });
    
    if(response.ok){
        const responseData: auddResponse = await response.json();
        return responseData
    }else {
        const error = await response.json();
        console.log("Error getting song data", error.message)
        return
    }
}

export async function getAnimeData(channel: string){
    const fileData = await Deno.readFile(path.join(MEDIA_PATH,`${channel}.jpg`));
    const response = await fetch("https://api.trace.moe/search?anilistInfo", { 
        method: "POST", 
        body: fileData, 
        headers: { "Content-type": "image/jpeg" } 
    });

    if(response.ok){
        const responseData: traceMoe = await response.json();
        return responseData
    }else {
        const error = await response.json();
        console.log("Error getting anime data", error)
        return
    }
}

export async function downloadAudio(m3u8_url: string, channel: string){

    const cmd = new Deno.Command("ffmpeg", {
        args: [
            "-hide_banner", 
            "-loglevel", "error",
            "-t", "30",
            "-i", m3u8_url,
            "-y", path.join(MEDIA_PATH,`${channel}.mp3`)
        ]
    })

    const cmdOut = await cmd.output()

    const error = DECODER.decode(cmdOut.stderr)

    if(!cmdOut.success){
        console.log("error downloading audio", error)
        return
    }
}

export async function downloadImage(m3u8_url: string, channel: string){

    const cmd = new Deno.Command("ffmpeg", {
        args: [
            "-hide_banner", 
            "-loglevel", "error",
            "-i", m3u8_url,
            "-frames:v", "1", 
            "-q:v", "2",
            "-y", path.join(MEDIA_PATH,`${channel}.jpg`)
        ]
    })

    const cmdOut = await cmd.output()

    const error = DECODER.decode(cmdOut.stderr)

    if(!cmdOut.success){
        console.log("error downloading audio", error)
        return
    }
}