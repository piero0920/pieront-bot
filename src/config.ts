import "https://deno.land/std@0.177.0/dotenv/load.ts"
import { schemaValidator } from 'deps'

const CONFIG = {
    REDIS_HOST:Deno.env.get("REDIS_HOST") as string,
    REDIS_PWD: Deno.env.get("REDIS_PWD") as string,
    TWITCH_CLIENT: Deno.env.get("TWITCH_CLIENT_ID") as string,
    TWITCH_SECRET: Deno.env.get("TWITCH_CLIENT_SECRET") as string,
    TWITCH_OAUTH: Deno.env.get("TWITCH_OAUTH_TOKEN") as string,
    TWITCH_BOT_USERNAME: Deno.env.get("TWITCH_BOT_NAME")?.toLowerCase() as string,
    TWITCH_BOT_TOKEN: Deno.env.get("TWITCH_BOT_TOKEN") as string,
    TWITCH_BOT_MOD: Deno.env.get("TWITCH_BOT_MOD_NAME")?.toLowerCase() as string,
    OPENAI_API_KEY: Deno.env.get("OPENAI_API_KEY") as string,
    OPENAI_CHAT_MODEL: Deno.env.get("OPENAI_CHAT_MODEL") as string,
    AUUD_API_TOKEN: Deno.env.get("AUUD_API_TOKEN") as string,
    DISCORD_TOKEN: Deno.env.get("DISCORD_TOKEN") as string,
}

const local_config_data = await Deno.readTextFile('config.json')
export const local_config:localConfig = JSON.parse(local_config_data)

export const localConfigShema = {
    historialLimit: {
        type: Number
    },
    historialCleanInHours: {
        type: Number
    },
    tokenLimit: {
        type: Number
    },
    cooldownTimeInSec: {
        type: Number
    },
    globalPrompt: {
        type: String
    },
    globalMessageModel:[{
        role: {
            type: String
        },
        content: {
            type: String
        }
    }],
    globalEmotes: [{type: String}],
    channels: [{
        channel: {
            type: String
        },
        description: {
            type: String
        },
        customPrompt: {
            type: String
        },
    }],
    randomMsg: [{
        role: {
            type: String
        },
        content: {
            type: String
        }
    }]
};

export async function validate_settings(){
    console.log('Validating settings')

    try {
        await Deno.readTextFile("config.json")
        await Deno.readTextFile(".env")
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
    
    if(Object.values(CONFIG).some(e=> e === undefined)){
        Object.keys(CONFIG).some(e=>{
            if(CONFIG[e as keyof typeof CONFIG] === undefined){
                throw 'Missing environment variable:' + e
            }
        })
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
    console.log('Settings validated!')
}

export {
    CONFIG
};