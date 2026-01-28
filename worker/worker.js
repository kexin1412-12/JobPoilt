export default {
    async fetch(request, env) {
        // Handle CORS
        if (request.method === "OPTIONS") {
            return new Response(null, {
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type",
                },
            });
        }

        if (request.method !== "POST") {
            return new Response("Method Not Allowed", { status: 405 });
        }

        try {
            const { prompt } = await request.json();

            if (!prompt) {
                return new Response("Missing prompt", { status: 400 });
            }

            // Use a capable model (Llama 3 8B is a good free tier balance)
            // verify the model ID in your Cloudflare dashboard if needed
            const model = "@cf/meta/llama-3-8b-instruct";

            const response = await env.AI.run(model, {
                messages: [
                    {
                        role: "system",
                        content: "You are a helpful career assistant AI. You output strictly JSON."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                stream: false, // We'll wait for the full response for simplicity in this integration
                response_format: { type: "json_object" } // Force JSON if supported, otherwise system prompt helps
            });

            // Depending on the model, response might be { response: "string" } or just the result
            // Most CF AI text-generation models return { response: "generated text" }

            return new Response(JSON.stringify(response), {
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
            });

        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
            });
        }
    },
};
