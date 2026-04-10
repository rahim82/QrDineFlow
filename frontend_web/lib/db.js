import mongoose from "mongoose";
import { env } from "./env.js";
const cache = global.mongooseCache ?? { conn: null, promise: null };
export async function connectToDatabase() {
    if (cache.conn) {
        return cache.conn;
    }
    if (!cache.promise) {
        cache.promise = mongoose.connect(env.mongodbUri, {
            bufferCommands: false
        });
    }
    cache.conn = await cache.promise;
    global.mongooseCache = cache;
    return cache.conn;
}
