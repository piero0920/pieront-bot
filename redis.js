import { config } from 'dotenv'
import redis from 'redis'
config()

const Client = redis.createClient({
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT
    },
    password: process.env.REDIS_PWD
});

Client.connect()
Client.on('connect', () => console.log(`Redis is connected`))
Client.on("error", (error) => console.error(error))

export default Client