import { RedisConnect } from 'deps'


const redis = await RedisConnect({
    hostname: "api.kala-vods.com",
    port: 6379,
    password: "ElliotAlderson"
})


console.log(redis.isConnected)

redis.close()