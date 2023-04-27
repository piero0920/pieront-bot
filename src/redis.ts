import { RedisConnect } from 'deps'
import { CONFIG, local_config } from 'app/src/config.ts'
import { datetime } from 'https://raw.githubusercontent.com/piero0920/ptera/master/datetime.ts'
import { get_auth_token, get_user, get_vods, is_channel_live, get_twitch_emotes, get_bttv_emotes, get_7tv_emotes } from 'app/src/api.ts'

const redis = await RedisConnect({
    hostname: CONFIG.REDIS_HOST,
    port: 6379,
    password: CONFIG.REDIS_PWD
})

function parseRedis(json: unknown , parse?: boolean){
    if(parse){
        return JSON.parse(json as string)
    }
    return JSON.stringify(json)
}

const BOT_PREFIX = "BOT:BOT"
const CHANNEL_PREFIX = "BOT:CHANNEL:"

export async function getBot(){
    const bot = await redis.get(BOT_PREFIX)

    if(bot == null){
        const token = await get_auth_token()
        const newBot: botDatabase = {
            bot_channel_id: "",
            bot_channel_name: CONFIG.TWITCH_BOT_USERNAME,
            access_token: token.access_token,
            expires_in_date: datetime().add({second: token.expires_in}).toMilliseconds(),
            global_emotes: local_config.globalEmotes,
            global_prompt: local_config.globalPrompt,
            globalMessageModel: local_config.globalMessageModel,
            historial_limit: local_config.historialLimit,
            historial_clean_in: local_config.historialCleanInHours,
            token_limit: local_config.tokenLimit,
            cooldown_time: local_config.cooldownTimeInSec
        }
        await redis.set(BOT_PREFIX, parseRedis(newBot))
        return newBot
    }

    return parseRedis(bot as string, true) as botDatabase
}

export async function saveBot(bot: botDatabase){
    await redis.set(BOT_PREFIX, parseRedis(bot))
}

export async function load_bot(){
    await getBot()
}

export async function load_channel_settings(){
    for(const channel of local_config.channels){
        console.log('Loading channel settings for', channel.channel)
        const user = await get_user(channel.channel)
        const vods = await get_vods(user.id)
        const is_live = await is_channel_live(user.id)
        const vod_date_sync = datetime().toMilliseconds() 

        const channel_doc: channelDatabase = {
            channel_name: user.login,
            channel_id: user.id,
            created_at: user.created_at,
            is_live: is_live,
            last_vod: vods.length ? vods[0].id : "0",
            last_vod_date_sync: vod_date_sync,
            esta_callado: false,
            esta_callado_date: 0,
            local_config: channel,
            user_cooldown: [],
            tv_emotes: [],
            bttv_emotes: [],
            ztv_emotes: []
        }

        await redis.set(CHANNEL_PREFIX + user.login, parseRedis(channel_doc))

        await update_emotes(user.login)

    }
}

export async function getChannel(prefix: string){
    const channel = await redis.get(CHANNEL_PREFIX + prefix)
    return parseRedis(channel, true) as channelDatabase
}

export async function update_emotes(channel_name: string){
    const channel = await getChannel(channel_name)
    if(channel){
        channel.tv_emotes = []
        channel.bttv_emotes = []
        channel.ztv_emotes = []

        const tv_emotes = await get_twitch_emotes(channel.channel_id)
        if(tv_emotes.length){
            for(const emote of tv_emotes){
                if(emote.tier && emote.tier.startsWith("1")){
                    channel.tv_emotes.push(emote.name)
                }
            }
        }

        const bttv_emotes = await get_bttv_emotes(channel.channel_id)
        if(bttv_emotes.length){
            for(const emote of bttv_emotes){
                channel.bttv_emotes.push(emote.code)
            }
        }

        const ztv_emotes = await get_7tv_emotes(channel.channel_id)
        if(ztv_emotes.length){
            for(const emote of ztv_emotes){
                channel.ztv_emotes.push(emote.name)
            }
        }

        await redis.set(CHANNEL_PREFIX + channel.channel_name, parseRedis(channel))
    }
}   

export {
    redis   
}