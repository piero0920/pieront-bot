import { startDB } from 'app/src/database.ts';
import { load_bot_settings, load_channel_settings, local_config } from 'app/src/config.ts';
import chat, { listenChannel } from 'app/src/tmi.ts'
import { runCronjobs } from 'app/src/cronjobs.ts'

await startDB()

await load_bot_settings()
await load_channel_settings()

runCronjobs()

try {
    await chat.connect();
    
    for(const channel of local_config.channels){
        chat.joinChannel(channel.channel)
    }

    for(const channel of chat.channels){
        listenChannel(channel[1])
    }
    
}catch(e) {
    console.error(e)
}