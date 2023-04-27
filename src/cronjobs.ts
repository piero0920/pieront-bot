import { cron, datetime } from 'deps'
import { local_config }  from 'app/src/config.ts'
import { update_emotes, getChannel, redis, CHANNEL_PREFIX, parseRedis }  from 'app/src/redis.ts'
import { is_channel_live, get_vods } from 'app/src/api.ts'


const channels: string[] = []

for(const c of local_config.channels){
    channels.push(c.channel.toLowerCase())
}

export function runCronjobs(){
    console.log('Cronjobs are registring')
    // every 2 minutes
    cron('*/2 * * * *', async()=>{
        for(const channel of channels){
            
            const channel_db = await getChannel(channel)
            const is_live = await is_channel_live(channel_db.channel_id)
            const vods = await get_vods(channel_db.channel_id)
            const vods_date_sync = datetime().toMilliseconds()
            channel_db.is_live = is_live
            channel_db.last_vod = vods.length ? vods[0].id : "0"
            channel_db.last_vod_date_sync = vods_date_sync

            await redis.set(CHANNEL_PREFIX + channel, parseRedis(channel_db))
        }
    })

    // every 1 hour
    cron('0 * * * *', async()=>{
        for(const channel of channels){
            await update_emotes(channel)
        }
    })
}