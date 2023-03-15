import "https://deno.land/std@0.177.0/dotenv/load.ts"
import db, { saveToDB } from "app/src/database.ts";
import { get_auth_token, get_user, get_vods, is_channel_live, get_twitch_emotes, get_bttv_emotes, get_7tv_emotes } from 'app/src/api.ts'
import { botDatabase, localConfig, channelDatabase, localConfigShema } from "interfaces";
import { datetime, ChatCompletionOptions, schemaValidator } from 'deps'

const local_config_data = await Deno.readTextFile('config.json')
export const local_config:localConfig = JSON.parse(local_config_data)


const config = {
    TWITCH_CLIENT: <string>Deno.env.get("TWITCH_CLIENT_ID"),
    TWITCH_SECRET: <string>Deno.env.get("TWITCH_CLIENT_SECRET"),
    TWITCH_OAUTH: <string>Deno.env.get("TWITCH_OAUTH_TOKEN"),
    TWITCH_BOT_USERNAME: <string>Deno.env.get("TWITCH_BOT_NAME")?.toLowerCase(),
    TWITCH_BOT_TOKEN: <string>Deno.env.get("TWITCH_BOT_TOKEN"),
    TWITCH_BOT_MOD: <string>Deno.env.get("TWITCH_BOT_MOD_NAME")?.toLowerCase(),
    OPENAI_API_KEY: <string>Deno.env.get("OPENAI_API_KEY"),
    AUUD_API_TOKEN: <string>Deno.env.get("AUUD_API_TOKEN"),
}

export async function validate_settings(){
    console.log('Validating settings')

    try {
        const _config = await Deno.readTextFile("config.json")
        const _env = await Deno.readTextFile(".env")
    } catch (error) {
        if (!(error instanceof Deno.errors.NotFound)) {
            throw error;
        }
        throw "Ensure if config.json or .env exits"
    }

    try {
        const _config = await Deno.readTextFile('config.json')
        JSON.parse(_config);
    } catch {
        throw "Ensure if config file is on json format"
    }

    const _config = await Deno.readTextFile("config.json")
    const err = schemaValidator.validate(JSON.parse(_config), localConfigShema, { allowUnknown: false });
    if(err){
        throw err.message
    }
    
    if(Object.values(config).some(e=> e === undefined)){
        let Missing!: string;
        Object.keys(config).some(e=>{
            if(config[e as keyof typeof config] === undefined){
                Missing = e
            }
        })
        throw 'Missing environment variable:' + Missing
    }
    
    let is_assistant = true
    let is_user = true
    let content_empty = false

    for(let i = 0; i < local_config.globalMessageModel.length; i++){
        if(i & 1){
            if(local_config.globalMessageModel[i].role !== "assistant"){
                is_assistant = false
            }
        }else {
            if(local_config.globalMessageModel[i].role !== "user"){
                is_user = false
            }
        }
        if(local_config.globalMessageModel[i].content === "" || local_config.globalMessageModel[i].content === undefined){
            content_empty = true
        }
    }
    if(!(is_assistant && is_user && !content_empty)){
        throw 'check if global message model is in a correct order and its not empty in the config file'
    }
}

function cleanGlobalMessageModel(){
    const cleanModel:ChatCompletionOptions["messages"] = []
    for(let i = 0; i < local_config.globalMessageModel.length; i++){
        if(i === 5){
            break
        }
        cleanModel.push(local_config.globalMessageModel[i])
    }
    return cleanModel
}

export async function load_bot_settings(){
    console.log('Loading bot settings')
    const token = await get_auth_token()
    const expires_in_date = datetime().add({second: token.expires_in }).toMilliseconds()
    const bot_doc:botDatabase = {
        bot_channel_id: "0",
        bot_channel_name: config.TWITCH_BOT_USERNAME,
        access_token: token.access_token,
        expires_in_date: expires_in_date,
        global_emotes: local_config.globalEmotes,
        global_prompt: local_config.globalPrompt,
        globalMessageModel: cleanGlobalMessageModel(),
        historial_limit: local_config.historialLimit,
        historial_clean_in: local_config.historialCleanInHours,
        token_limit: local_config.tokenLimit,
        cooldown_time: local_config.cooldownTimeInSec
    }

    await saveToDB(db.bot_db,'bot', bot_doc)

    const bot = db.bot_db.get('bot')
    
    const user = await get_user(bot.bot_channel_name)

    bot.bot_channel_id = user.id

    await saveToDB(db.bot_db,'bot', bot)
}

export async function load_channel_settings(){
    for(const channel of local_config.channels){
        console.log('Loading channel settings for', channel.channel)
        const user = await get_user(channel.channel)
        const vods = await get_vods(user.id)
        const is_live = await is_channel_live(user.id)
        const vod_date_sync = datetime().toMilliseconds() 
        const channel_doc: channelDatabase = {
            channel_name: channel.channel.toLowerCase(),
            channel_id: user.id,
            created_at: user.created_at,
            is_live: is_live,
            last_vod: vods[0].id,
            last_vod_date_sync: vod_date_sync,
            esta_callado: false,
            esta_callado_date: 0,
            local_config: channel,
            user_cooldown: [],
            tv_emotes: [],
            bttv_emotes: [],
            ztv_emotes: []
        }
        await saveToDB(db.channel_db, channel_doc.channel_name, channel_doc)

        await update_emotes(channel_doc.channel_name)
    }    
}

export async function update_emotes(channel: string){
    const channel_in_db = db.channel_db.get(channel)
    if(channel_in_db){
        channel_in_db.tv_emotes = []
        channel_in_db.bttv_emotes = []
        channel_in_db.ztv_emotes = []
        const tv_emotes = await get_twitch_emotes(channel_in_db.channel_id)
        for(const emote of tv_emotes){
            if(emote.tier && emote.tier.startsWith("1")){
                channel_in_db.tv_emotes.push(emote.name)
            }
        }
        const bttv_emotes = await get_bttv_emotes(channel_in_db.channel_id)
        for(const emote of bttv_emotes){
            channel_in_db.bttv_emotes.push(emote.code)
        }
        const ztv_emotes = await get_7tv_emotes(channel_in_db.channel_id)
        for(const emote of ztv_emotes){
            channel_in_db.ztv_emotes.push(emote.name)
        }
        await saveToDB(db.channel_db, channel, channel_in_db)
    }
}

export default config;