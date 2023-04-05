const { Configuration, OpenAIApi } = require("openai");
require("dotenv").config();


// Openai setup
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);


// Translate the message using GPT-4
async function translateMessage(text) {
    try {
        const completion = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "You are a helpful assistant that translates Italian to English. The output needs to be only the translated sentence." },
                { role: "user", content: `${text}` },
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

