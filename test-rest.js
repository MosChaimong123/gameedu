async function testRest() {
    const fs = await import("fs");
    let envKey = "";
    try {
        const envContent = fs.readFileSync('.env', 'utf8');
        const match = envContent.match(/GEMINI_API_KEY=(.*)/);
        if (match) envKey = match[1].trim().replace(/"/g, '');
    } catch {}

    if (!envKey) {
        console.error("GEMINI_API_KEY NOT FOUND");
        return;
    }

    console.log("Testing with key:", envKey.substring(0, 5) + "...");

    // Try v1 API with a simple text prompt
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${envKey}`;
    
    const body = {
        contents: [{
            parts: [{ text: "Hello, answer in one word: OK" }]
        }]
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        console.log("Status:", response.status);
        if (response.ok) {
            console.log("SUCCESS!", JSON.stringify(data, null, 2));
        } else {
            console.log("FAILURE!", JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error("FETCH ERROR:", e);
    }
}

testRest();
