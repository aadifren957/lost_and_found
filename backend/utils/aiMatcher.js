// Hugging Face embedding helper.
// Uses sentence-transformers/all-MiniLM-L6-v2 via the hf-inference router
// (feature-extraction pipeline). Embeddings are computed ONCE per item on
// save, then cached on the document. At search time we just do cosine
// similarity locally — no HF calls, instant results.

const HF_API_KEY = process.env.HF_API_KEY;
const HF_MODEL = "sentence-transformers/all-MiniLM-L6-v2";
const HF_URL = `https://router.huggingface.co/hf-inference/models/${HF_MODEL}/pipeline/feature-extraction`;

function buildText(item) {
    return [
        item.title || "",
        item.category || "",
        item.location || "",
        item.description || ""
    ]
        .filter(Boolean)
        .join(". ")
        .trim();
}

// Fetch a single 384-dim embedding for a text string.
// Returns null on failure — callers should handle that gracefully.
async function getEmbedding(text) {
    if (!text || !text.trim()) return null;
    if (!HF_API_KEY) {
        console.error("❌ HF_API_KEY not set");
        return null;
    }

    try {
        const response = await fetch(HF_URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${HF_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                inputs: text,
                normalize: true,
                truncate: true,
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("❌ HF API error:", response.status, errText);
            return null;
        }

        const data = await response.json();
        // Single-input response: [384 floats]
        if (Array.isArray(data) && data.every((n) => typeof n === "number")) {
            return data;
        }
        // Some provider variants wrap it: [[384 floats]]
        if (Array.isArray(data) && Array.isArray(data[0])) {
            return data[0];
        }

        console.error("❌ Unexpected HF response shape:", data);
        return null;
    } catch (err) {
        console.error("❌ HF request failed:", err.message);
        return null;
    }
}

// Convenience: build the canonical text for an item and embed it.
async function getItemEmbedding(item) {
    return getEmbedding(buildText(item));
}

// Pure-JS cosine similarity. Both vectors are already L2-normalized
// (we pass normalize:true to HF), so this is just a dot product.
function cosineSimilarity(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b)) return 0;
    if (a.length === 0 || a.length !== b.length) return 0;

    let dot = 0;
    for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
    // Clamp floating error
    if (dot > 1) dot = 1;
    if (dot < -1) dot = -1;
    return dot;
}

// Produce a 0–100 score from two items' cached embeddings, with a small
// category-match boost (strong real-world signal for lost & found).
function scoreFromEmbeddings(lostItem, foundItem) {
    const sim = cosineSimilarity(lostItem.embedding, foundItem.embedding);
    // Map [-1,1] -> [0,100]. In practice MiniLM gives 0..1 for related text.
    let score = Math.round(Math.max(0, sim) * 100);

    if (
        lostItem.category &&
        foundItem.category &&
        lostItem.category.trim().toLowerCase() ===
            foundItem.category.trim().toLowerCase()
    ) {
        score = Math.min(100, score + 10);
    }

    return score;
}

module.exports = {
    getEmbedding,
    getItemEmbedding,
    cosineSimilarity,
    scoreFromEmbeddings,
    buildText,
};
