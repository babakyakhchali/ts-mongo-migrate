import { config } from "dotenv";
config();
import { MongoClient } from "mongodb";
const log = require('single-line-log').stdout;
async function main() {
    try {
        console.log('started:',new Date);
        const srcClient = await MongoClient.connect(process.env.SRC!);
        const dstClient = await MongoClient.connect(process.env.DST!);
        const collections = await srcClient.collections();
        for (const c of collections) {
            if (c.collectionName.startsWith('system')) {
                console.log('skipping system collection', c.collectionName);
                continue;
            }
            console.log(c.collectionName);
            let cnt = await c.count({});
            let nc = await dstClient.createCollection(c.collectionName)
            let indexes = await c.indexes();
            for (const idx of indexes) {
                if (idx.key._id) {
                    continue;
                }                
                let nidx: any = { name: idx.name };
                if (idx.unique) {
                    nidx.unique = idx.unique;
                }
                if (idx.background) {
                    nidx.background = idx.background;
                }
                if (idx.expireAfterSeconds) {
                    nidx.expireAfterSeconds = idx.expireAfterSeconds;
                }
                await nc.createIndex(idx.key, nidx);
            }
            let docs = c.find({});
            let i = 0;
            while (await docs.hasNext()) {
                let d = await docs.next();
                log(i++,cnt, d._id);
                await nc.insertOne(d, {});
            }
            console.log('\n')
        }        
        console.log('end:',new Date);
        process.exit();
    } catch (error) {
        console.error(error);
    }
}
main();
