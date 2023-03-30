const express = require('express');
const app = express();
const axios = require('axios');

const personalProjectId = 26874141;
const personalCampfireId = 4772535975;

// Fetch all the data from the API
async function fetchAllData(accessToken, accountId, page = 1, allData = []) {
    try {
        const response = await axios.get(`https://3.basecampapi.com/${accountId}/buckets/${personalProjectId}/chats/${personalCampfireId}/lines.json?page=${page}`, {
            headers: {
                'Authorization': 'Bearer ' + accessToken,
                'User-Agent': 'Redergo (lorenzo.tlili@redergo.com)',
            },
        });

        if (response.data.length === 0) {
            // Extract only the content of the messages
            const contents = allData.map(line => line.content);
            return contents;
        }

        allData = allData.concat(response.data);
        return fetchAllData(accessToken, accountId, page + 1, allData);
    } catch (error) {
        console.error(error);
        throw new Error('Errore nel recupero dei dati');

    }
}

module.exports = {
    fetchAllData,
};