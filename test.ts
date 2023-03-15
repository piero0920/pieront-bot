import * as validate from "https://raw.githubusercontent.com/piero0920/schema_validator/master/mod.ts";
import { localConfig } from "interfaces"

const localConfigShema = {
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
};


const file = await Deno.readTextFile("config.json")
const err = validate.validate(JSON.parse(file), localConfigShema, { allowUnknown: false });
console.log(err?.message);