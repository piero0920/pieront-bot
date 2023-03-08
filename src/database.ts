import { DsDDB, path, fs } from "deps";
import { botDatabase, readDatabase, dataFromDatabase, channelDatabase, chatBotMsgDatabase } from "interfaces";

const db_root = "database"

await fs.ensureDir(db_root)
const paths: string[] = []

const bot_db_path = path.join(db_root, 'bot.json')
const bot_db = new DsDDB<botDatabase>(bot_db_path)
paths.push(bot_db_path)

const channel_db_path = path.join(db_root, 'channels.json')
const channel_db = new DsDDB<channelDatabase>(channel_db_path)
paths.push(channel_db_path)

const msg_db_path = path.join(db_root, 'messages.json')
const msg_db = new DsDDB<chatBotMsgDatabase>(msg_db_path)
paths.push(msg_db_path)

const db = {
    bot_db,
    channel_db,
    msg_db
}

async function readDatabase(path: string): Promise<readDatabase>{
    try {
        const file = await Deno.readTextFile(path)
        return {
            status: true,
            file: file
        }
    }catch {
        return {
            status: false,
            file: undefined
        }
    }

}

async function readMigratedDB(){
    const data: dataFromDatabase[] = []
    for(const path of paths){
        const database = await readDatabase(path)
        if(database.status && database.file){
            data.push({
                path: path,
                data: database.file
            })
        }
    }
    return data
}

async function writeMigratedDB(data: dataFromDatabase[]){
    for(const database of data){
        await Deno.writeTextFile(database.path, database.data)
    }
}

export async function startDB(){
    console.log('Starting database')
    const data = await readMigratedDB()
    await bot_db.load()
    await channel_db.load()
    await msg_db.load()
    await writeMigratedDB(data)
}

export async function saveToDB(db: DsDDB<botDatabase | channelDatabase | chatBotMsgDatabase>, key: string, doc: botDatabase | channelDatabase | chatBotMsgDatabase ){
    db.set(key,doc)
    await db.write()
}

export default db