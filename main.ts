import { validate_settings, local_config } from 'app/src/config.ts'
import { load_bot, load_channel_settings } from 'app/src/redis.ts'
import { TMI_CLIENT, listenChannel } from 'app/src/tmi.ts'


validate_settings()

await load_bot()
await load_channel_settings()

try {
    await TMI_CLIENT.connect();
    
    for(const channel of local_config.channels){
        TMI_CLIENT.joinChannel(channel.channel)
    }

    for(const channel of TMI_CLIENT.channels){
        listenChannel(channel[1])
    }
    
}catch(e) {
    console.error(e)
}