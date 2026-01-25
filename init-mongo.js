const { MongoClient } = require("mongodb");

async function main() {
    const uri = "mongodb://127.0.0.1:27017/admin?directConnection=true";
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log("Connected to MongoDB...");

        const adminDb = client.db("admin");
        const result = await adminDb.command({ replSetInitiate: {} });

        console.log("Replica Set Initiated Successfully:", result);
    } catch (err) {
        if (err.codeName === 'AlreadyInitialized') {
            console.log("Replica Set is ALREADY initialized. You are good to go!");
        } else {
            console.error("Failed to initiate Replica Set:", err);
        }
    } finally {
        await client.close();
    }
}

main();
