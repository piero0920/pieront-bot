import Redis from './redis.js'


async function main(){
    const keys = await Redis.keys("BOT:#endnatsu:*")
    console.log(keys)
    for(const key of keys){
        console.log(key)
    }
}
main()