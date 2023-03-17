import { chatOpenAI } from "app/src/openai.ts";
import { local_config } from "app/src/config.ts";


const response = await chatOpenAI(local_config.randomMsg,"piero")

console.log(response.msg?.content)