import { MongoClient } from "mongodb";

// Fetch database URL from .env if possible, otherwise use local default
const url = "mongodb://localhost:27017/gamedu?replicaSet=rs0";
const client = new MongoClient(url);

async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    
    const db = client.db("gamedu");
    const collection = db.collection("Item");

    // Check if it already exists
    const existing = await collection.findOne({ name: "Mana Potion (ยาโพชั่นมานา)" });
    if (existing) {
      console.log("Mana Potion already exists in database.");
      return;
    }

    const doc = {
      name: "Mana Potion (ยาโพชั่นมานา)",
      description: "ฟื้นฟู Mana จำนวน 30 หน่วยทันที",
      price: 50,
      type: "CONSUMABLE",
      currency: "GOLD",
      manaRestore: 30,
      staminaRestore: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      tier: "COMMON",
      baseHp: 0,
      baseAtk: 0,
      baseDef: 0,
      goldMultiplier: 0,
      bossDamageMultiplier: 0,
      baseSpd: 0,
      baseCrit: 0,
      baseLuck: 0,
      baseMag: 0,
      baseMp: 0,
      xpMultiplier: 0
    };

    const result = await collection.insertOne(doc as any);
    console.log(`Success! Mana Potion inserted with _id: ${result.insertedId}`);
  } catch (err) {
    console.error("Error seeding with MongoDB driver:", err);
  } finally {
    await client.close();
  }
}

run().catch(console.dir);
