const fs = require('fs');

async function listAllModels() {
    let envKey = "";
    try {
        const envContent = fs.readFileSync('.env', 'utf8');
        const match = envContent.match(/GEMINI_API_KEY=(.*)/);
        if (match) envKey = match[1].trim().replace(/"/g, '');
    } catch (e) {}

    if (!envKey) return;

    // Use v1beta list endpoint
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${envKey}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log("Status:", response.status);
        if (response.ok) {
            console.log("AVAILABLE MODELS:");
            if (data.models) {
                data.models.forEach(m => console.log(`- ${m.name}`));
            } else {
                console.log("No models found in response.");
            }
        } else {
            console.log("FAILURE!", JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error("FETCH ERROR:", e);
    }
}

listAllModels();
