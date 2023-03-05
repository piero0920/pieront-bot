import Redis from './redis.js'


async function main(){
    const keys = await Redis.keys("BOT:#*:*")
    console.log(keys)
    for(const key of keys){
        console.log(key)
        await Redis.del(key)
    }
}
main()