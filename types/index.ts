export {}

declare global {
    interface channelLocalConfig {
        channel             : string;
        description         : string;
        customPrompt        : string;
    }
    
    interface ChatCompletionMessage {
        name?: string;
        role: "system" | "assistant" | "user";
        content: string;
      }

    interface localConfig {
        channels            : channelLocalConfig[]
        globalEmotes        : string[]
        globalPrompt        : string
        globalMessageModel  : ChatCompletionMessage[]
        historialLimit      : number
        historialCleanInHours: number
        tokenLimit          : number
        cooldownTimeInSec   : number
        randomMsg           : ChatCompletionMessage[]
    }

    interface botDatabase {
        bot_channel_id      : string;
        bot_channel_name    : string;
        access_token        : string;
        expires_in_date     : number;
        global_emotes       : string[];
        global_prompt       : string;
        globalMessageModel  : ChatCompletionMessage[]
        historial_limit     : number;
        historial_clean_in  : number;
        token_limit         : number;
        cooldown_time       : number;
    }

    interface accessToken {
        access_token        : string;
        expires_in          : number;
        token_type          : string;
    }
    
    interface twitchApiError {
        status              : number;
        message             : string;
    }
    
    interface TwitchUser {
        id                  : string;
        login               : string;
        display_name        : string;
        created_at          : string;
    }
    
    interface TwitchUserResponse {
        data                : TwitchUser[];
    }

    interface TwitchVideo {
        id                  : string
        stream_id           : string
        title               : string
        created_at          : string
        view_count          : number
    }
    
    interface TwitchVideoResponse {
        data                : TwitchVideo[],
    }

    interface TwitchStream {
        id                  : string
        title               : string
        started_at          : string
    }
    
    interface TwitchStreamResponse {
        data                : TwitchStream[]
    }

    interface TwitchEmote {
        id                  : string
        name                : string
        tier                : string
        images              : {
            url_4x          : string
        }
        format              : string[]
    }
    
    interface TwitchEmoteResponse {
        data                : TwitchEmote[],
    }

    interface bttvEmote {
        id                  : string;
        code                : string;
    }
    
    interface bttvEmoteResponse {
        sharedEmotes        : bttvEmote[]
    }

    interface ztvEmote {
        id                  : string;
        name                : string;
    }

    interface PlaybackAccessError {
        message: string;
        path: string[]
    }
    
    interface videoPlaybackAccessToken{
        errors: PlaybackAccessError[];
        data: {
            streamPlaybackAccessToken: {
                value: string;
                signature: string;
            },
            videoPlaybackAccessToken: {
                value: string;
                signature: string;
            }
        }
    }

    interface auudResult {
        artist      : string;
        title       : string;
        album       : string;
        release_date: string;
        label       : string;
        timecode    : string;
        song_link   : string;
    }

    interface auddResponse {
        status      : string;
        result      : auudResult | null
    }

    interface traceMoeAnilistTitle {
        native      : string;
        romaji      : string;
        english     : string;
    }
    
    interface traceMoeAnilist {
        id          : number;
        idMal       : number;
        title       : traceMoeAnilistTitle;
        synonyms    : string[];
        isAdult     : boolean;
    }
    
    interface traceMoeResult {
        anilist     : traceMoeAnilist;
        filename    : string;
        episode     : number | null;
        from        : number;
        to          : number;
        similarity  : number;
        video       : string;
        image       : string;
    }
    
    interface traceMoe {
        frameCount  : number;
        error       : string;
        result      : traceMoeResult[];
    }

    interface cooldown {
        user_id             : string;
        user_name           : string;
        cooldown_time       : number;
    }

    interface channelDatabase {
        channel_name        : string;
        channel_id          : string;
        created_at          : string;
        is_live             : boolean;
        last_vod            : string;
        last_vod_date_sync  : number;
        esta_callado        : boolean;
        esta_callado_date   : number;
        local_config        : channelLocalConfig
        user_cooldown       : cooldown[];
        tv_emotes           : string[];
        bttv_emotes         : string[];
        ztv_emotes          : string[];
    }

    interface chatOpenAIResponse {
        success             : boolean;
        tokens              : number | undefined;
        msg                 : ChatCompletionMessage | undefined;
    }
}