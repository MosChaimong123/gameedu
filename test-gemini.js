const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
    // API KEY is hardcoded for a quick test from the environment
    const apiKey = "REPLACED_WITH_ENV_VALUE"; 
    // Wait, I can't easily get the env value here without require('dotenv'). 
    // I will read .env file manually.
    const fs = require('fs');
    let envKey = "";
    try {
        const envContent = fs.readFileSync('.env', 'utf8');
        const match = envContent.match(/GEMINI_API_KEY=(.*)/);
        if (match) envKey = match[1].trim();
    } catch (e) {}

    if (!envKey) {
        console.error("GEMINI_API_KEY NOT FOUND IN .env");
        return;
    }

    const genAI = new GoogleGenerativeAI(envKey);
    try {
        const result = await genAI.listModels();
        console.log("Available models:");
        result.models.forEach(m => {
            console.log(`- ${m.name} (Methods: ${m.supportedGenerationMethods.join(", ")})`);
        });
    } catch (e) {
        console.error("Error listing models:", e);
    }
}

listModels();
