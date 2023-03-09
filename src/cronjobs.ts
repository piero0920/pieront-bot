import { cron, datetime } from 'deps'
import { local_config, update_emotes }  from 'app/src/config.ts'
import { is_channel_live, get_vods, validate_auth_token, update_bot_auth_token } from 'app/src/api.ts'
import db, { saveToDB } from 'app/src/database.ts'

const channels: string[] = []

for(const c of local_config.channels){
    channels.push(c.channel.toLowerCase())
}

export function runCronjobs(){
    console.log('Cronjobs are registring')
    // every 5 minutes
    cron('*/5 * * * *', async()=>{
        for(const channel of channels){
            const channel_db = db.channel_db.get(channel)
            const is_live = await is_channel_live(channel_db.channel_id)
            const vods = await get_vods(channel_db.channel_id)
            const vods_date_sync = datetime().toMilliseconds()
            channel_db.is_live = is_live
            channel_db.last_vod = vods[0].id
            channel_db.last_vod_date_sync = vods_date_sync
            await saveToDB(db.channel_db, channel, channel_db)
        }
    })
    // every 1 hour
    cron('0 * * * *', async()=>{
        for(const channel of channels){
            await update_emotes(channel)
        }

        const validated = await validate_auth_token()
        if(validated){
            const bot = db.bot_db.get("bot")
            const validated_date = datetime().add({second: validated.expires_in})
            const one_hour_ago = datetime().subtract({hour: 1})
            if(validated_date.isAfter(one_hour_ago)){
                await update_bot_auth_token(bot)
            }
        }
    })
}