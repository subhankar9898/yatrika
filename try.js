import { readFile } from 'node:fs/promises';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.NVIDIA_API_KEY || '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',
    baseURL: 'https://integrate.api.nvidia.com/v1',
})

async function main() {

    const completion = await openai.chat.completions.create({
        model: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
        messages: [{ "role": "user", "content": "" }],
        temperature: 0.6,
        top_p: 0.95,
        max_tokens: 65536,
        reasoning_budget: 16384,
        chat_template_kwargs: { "enable_thinking": true },

        stream: false,


    })

    const reasoning = completion.choices[0]?.message?.reasoning_content;
    if (reasoning) process.stdout.write(reasoning + "\n");
    process.stdout.write(completion.choices[0]?.message?.content || '');


}

main();
