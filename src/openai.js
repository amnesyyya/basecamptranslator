const { Configuration, OpenAIApi } = require("openai");
require("dotenv").config();

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);



async function translateMessage(text) {
    try {
        const completion = await openai.createChatCompletion({
            model: "gpt-4",
            messages: [
                { role: "system", content: "You are a helpful assistant that translates Italian to English." },
                { role: "user", content: `Translate the following Italian text to English: "${text}"` },
            ],
        });
        return completion.data.choices[0].message;
    } catch (error) {
        console.log(error);
    }
}

module.exports = {
    translateMessage,
};

