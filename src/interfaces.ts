import { ChatCompletionResponseMessage } from 'deps'

export interface botDatabase {
    bot_channel_id      : string;
    bot_channel_name    : string;
    access_token        : string;
    expires_in_date     : number;
    global_emotes       : string[];
    global_prompt       : string;
    globalMessageModel  : ChatCompletionResponseMessage[]
    historial_limit     : number;
    historial_clean_in  : number;
    token_limit         : number;
    cooldown_time       : number;
}

export interface readDatabase{
    status              : boolean;
    file                : string | undefined;
}

export interface dataFromDatabase {
    path                : string;
    data                : string;
}

export interface accessToken {
    access_token        : string;
    expires_in          : number;
    token_type          : string;
}

export interface twitchApiError {
    status              : number;
    message             : string;
}

export interface channelLocalConfig {
    channel             : string;
    description         : string;
    customPrompt        : string;
}

export interface localConfig {
    channels            : channelLocalConfig[];
    globalEmotes        : string[];
    globalPrompt        : string;
    globalMessageModel  : ChatCompletionResponseMessage[];
    historialLimit      : number;
    historialCleanInHours: number;
    tokenLimit          : number;
    cooldownTimeInSec   : number;
}

export interface TwitchUser {
    id                  : string;
    display_name        : string;
    created_at          : string;
}

export interface TwitchUserResponse {
    data                : TwitchUser[];
}

export interface cooldown {
    user_id             : string;
    user_name           : string;
    cooldown_time       : number;
}

export interface channelDatabase {
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

export interface chatBotMsgDatabase{
    channel             : string;
    channel_id          : string;
    user_name           : string;
    user_id             : string;
    ttl                 : number;
    tokens              : number;
    cooldown_time       : number;
    msgs                : ChatCompletionResponseMessage[]
}

export interface TwitchVideo {
    id                  : string
    stream_id           : string
    title               : string
    created_at          : string
    view_count          : number
}

export interface TwitchVideoResponse {
    data                : TwitchVideo[],
}

export interface TwitchStream {
    id                  : string
    title               : string
    started_at          : string
}

export interface TwitchStreamResponse {
    data                : TwitchStream[]
}

export interface TwitchEmote {
    id                  : string
    name                : string
    tier                : string
    images              : {
        url_4x          : string
    }
    format              : string[]
}

export interface TwitchEmoteResponse {
    data                : TwitchEmote[],
}

export interface bttvEmote {
    id                  : string;
    code                : string;
}

export interface bttvEmoteResponse {
    sharedEmotes        : bttvEmote[]
}

export interface ztvEmote {
    id                  : string;
    name                : string;
}

export interface chatOpenAIResponse {
    success             : boolean;
    status_text         : string;
    tokens              : number | undefined;
    msg                 : ChatCompletionResponseMessage | undefined;
}

export interface validateToken {
    client_id           : string;
    expires_in          : number;
}