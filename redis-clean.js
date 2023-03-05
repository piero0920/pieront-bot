import Redis from './redis.js'



const keys = await Redis.keys("BOT:#endntasu:*")

for(const key of keys){
    console.log(key)
}