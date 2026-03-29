async function fix() {
    const { MongoClient } = await import("mongodb");
    console.log("Fixing existing students...");
    const m = new MongoClient('mongodb://localhost:27017');
    try {
        await m.connect();
        const db = m.db('gamedu');
        const students = db.collection('Student');
        
        const cursor = students.find({ loginCode: { $exists: false } });
        let count = 0;
        
        for await (const s of cursor) {
            const loginCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            await students.updateOne({ _id: s._id }, { $set: { loginCode } });
            count++;
        }
        
        console.log(`Successfully updated ${count} existing students with login codes.`);
    } catch(e) {
        console.error("Error:", e);
    } finally {
        await m.close();
    }
}

fix();
