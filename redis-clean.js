import Redis from './redis.js'



const keys = await Redis.sendCommand("KEYS BOT:#endntasu:*")

for(const key of keys){
    console.log(key)
}