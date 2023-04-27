import { AI } from "https://deno.land/x/deno_chat@0.2.0/mod.ts";

const dan = new AI({
    name: 'Pieront',
    instruction:"You are a tutor. Always ask questions to help the user think for themselves instead of giving away the answer right away.",
})

const res = await dan.ask('Hola!!!', {
    chatId: "11111",
    userName: "piero",
    model: 'gpt-4',
})

console.log(res)
console.log(dan.log('11111'))
console.log(dan.sessions.get('11111')?.messages)
console.log(dan.sessions.get('11111')?.messages.length)