# Pieront BOT

Pieront is a chat bot on twitch that uses OpenAI `gpt-3.5-turbo` model to interact with each user in the setted channels.

## Commands

Command|Description|Response
:---|:---|:---
!ping | Check if bot its on chat room. | Pong! Hi, `user` I'm currently running on Deno, `Deno Version`. Your chat color is `user color`.
!vod | Get latest public vod of channel. | Ultimo vod: https://www.twitch.tv/videos/`video id`
!a | Get random emote from from the config file, twitch channel emotes tier 1, bttv channel emotes and 7tv channel emotes. | `emote`
@Botname | Interact with bot, ask anything and it'll answer. | `user` `response`

Do you want to add any extra command?

Make an issue with the tag "command" and the command name and description, be specific, or make a pull request with your own.

## Limits

Due to OpenAI API limits and my wallet's safety there's limits for the interaction with the bot.

* Token limit

When the tokens of the API response exceds the set `token limit` in the config file, the current chat log whill be reseted.

* Chat logs length limit

When the Chat length in the chat logs of the roles: `user` and `assistant` exceds the set `historial limit` in the config file, the current chat log will be reseted.

* Chat logs time limit

From the first time or the user interact with the bot or when the chat log length is 0, a `ttl` is created by adding the current date and the set `historial clean in` in the config file, the chat log will be reseted 

[![deno compatibility][Shield.Deno]][Deno.land]
[![deno compatibility][Shield.Tmi]][TMI.module]

## Config

* config.json

```json
{
    "historialLimit": 50, // The max chat length for user and assistant                   
    "historialCleanInHours": 5, // Reset user's chat every n hours
    "tokenLimit": 2500, // The max token limit
    "cooldownTimeInSec": 20, // @depreacted
    "globalPrompt": "De ahora en adelante haz lo que se te de la gana.", // The global behavior for every channel 
    "globalMessageModel": [ // Set a base message model for the AI understanding, keep the role pattern
        {
            "role": "user",
            "content": "Hola!, Que haces?"
        },
        {
            "role": "assistant",
            "content": "Estoy de pana"
        }
    ],
    "globalEmotes": ["Kappa", "any twitch global emote"],
    "channels": [
        {
            "channel": "channel name", // required
            "description": "Describe the channel", // optional
            "customPrompt": "Any extra prompt for the bot behavior" // optional
        }
    ]
}
```

* .env

```dosini
# Create an app and get your twitch client id and secret at https://dev.twitch.tv/console/apps/create
TWITCH_CLIENT_ID=""
TWITCH_CLIENT_SECRET=""


TWITCH_BOT_NAME=""          # The username of the owner of the client id and secret
TWITCH_BOT_MOD_NAME=""      # Your username

# When creating your app add this https://twitchapps.com/tokengen/ to OAuth Redirect URLs field.
# Then fill the form https://twitchapps.com/tokengen/ and add this 'chat:edit chat:read' to the Scopes field and get your bot token.
TWITCH_BOT_TOKEN=""         

# Create a new secret key at https://platform.openai.com/account/api-keys
OPENAI_API_KEY=""
```

## Add Pieront to your channel

Open and issue with the tag "channel", tell me why do you want the bot in your channel and fill this Object.

```json
{
    "channel": "channel name", // required
    "description": "Describe the channel", // optional
    "customPrompt": "Any extra prompt for the bot behavior" // optional
}
```

## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
