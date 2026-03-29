async function listModels() {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const fs = await import("fs");
    let envKey = "";
    try {
        const envContent = fs.readFileSync('.env', 'utf8');
        const match = envContent.match(/GEMINI_API_KEY=(.*)/);
        if (match) envKey = match[1].trim();
    } catch {}

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
    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
