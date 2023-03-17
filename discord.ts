import { createBot, startBot, Intents, ActivityTypes } from "https://deno.land/x/discordeno@13.0.0/mod.ts";
import { chatOpenAI } from "app/src/openai.ts"
import config from "app/src/config.ts"

const bot = createBot({
    token: config.DISCORD_TOKEN,
    intents: Intents.Guilds | Intents.GuildMessages | Intents.GuildMessageTyping | Intents.MessageContent,
    events: {
        ready() {
            console.log("Successfully connected to gateway");
        },
    },
});

bot.events.messageCreate = async function (_b, message) {
    if(message.isFromBot) return
    if(message.mentionedUserIds.length == 0) return
    if(message.mentionedUserIds.find(e => e !== bot.id)) return
    const mention = new RegExp("<@(.*?)>")
    const cleanMsg = message.content.replace(mention, "").trim()
    if(!cleanMsg) return

    const chatMsg = [{
        role: "user",
        content: cleanMsg
    }]
    const response = await chatOpenAI(chatMsg, message.tag)

    if(!response.success || !response.msg ) return
    const responseContent = response.msg?.content

    await bot.helpers.sendMessage(message.channelId, {
        content: responseContent,
        messageReference: {
            messageId: message.id,
            channelId: message.channelId,
            guildId: message.guildId,
            failIfNotExists: true
        }
    })
};

bot.gateway.manager.createShardOptions.makePresence = (shardId: number) => {
    return {
        shardId,
        status: 'online',
        activities: [
            {
                name: 'Discordeno',
                type: ActivityTypes.Game,
                createdAt: Date.now(),
            },
        ],
    }
}
  

await startBot(bot);