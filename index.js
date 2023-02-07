import { RefreshingAuthProvider  } from '@twurple/auth';
import { ChatClient } from '@twurple/chat';
import { ApiClient } from '@twurple/api'
import { config } from 'dotenv'
import { promises as fs } from 'fs';
import { Configuration, OpenAIApi } from 'openai'

config()

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

async function askOpenAI(prompt, user){
    const response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: prompt,
        temperature: 0.7,
        top_p: 1,
        max_tokens: 100, 
        frequency_penalty: 0,
        presence_penalty: 0,
        user: user,
        stop: ["{}"]
      });
    return response.data.choices[0].text.replace(/(\r\n|\n|\r)/gm, "")
}


async function main() {

    const tokenData = JSON.parse(await fs.readFile('./json/tokens.json', 'UTF-8'));
    const authProvider = new RefreshingAuthProvider(
        {
            clientId: process.env.TWITCH_CLIENT_ID,
            clientSecret: process.env.TWITCH_CLIENT_SECRET,
            onRefresh: async newTokenData => await fs.writeFile('./json/tokens.json', JSON.stringify(newTokenData, null, 4), 'UTF-8')
        },
        tokenData
    );
    const helixApi = new ApiClient({authProvider});
    const chatClient = new ChatClient({ authProvider, channels: JSON.parse(await fs.readFile('./json/channels.json', 'UTF-8')) });
    
    await chatClient.connect();

    chatClient.onMessage(async (channel, user, text, msg) => {
        const atSelf = new RegExp(/^@Pieront/g)
        if(atSelf.test(text)){
            const response = await askOpenAI(text, user)
            chatClient.say(channel, `${user} ${response}`)
        }
        if(text.startsWith('!!')){
            if(text === '!!vod'){
                const channel_id = (await helixApi.users.getUserByName(channel.slice(1))).id
                const lastVOD = (await helixApi.videos.getVideosByUser(channel_id,{ limit: 1, type: 'archive'})).data[0].url
                if(channel === '#kalathraslolweapon'){
                    chatClient.say(channel, `!hug ${lastVOD}`)
                }else{
                    chatClient.say(channel, `${user}, UTLIMO VOD: ${lastVOD}`)
                }
            }
        }
        const botRe = new RegExp(/piero/g)
        if(botRe.test(text) && !(user == chatClient.currentNick)){
            const emotes = JSON.parse(await fs.readFile('./json/emotes.json', 'UTF-8'))
            const random = Math.floor(Math.random() * emotes.length);
            chatClient.say(channel, emotes[random], { replyTo: msg })
        }
    });

}

main();
