const express = require('express');
const axios = require('axios');
const router = express.Router();

const clientId = '6bd81c811ef84c23bd9c1920ded7a8d1';
const clientSecret = '85a9819603dd40c196a4066316c62335';

router.get('/nowplaying', async (req, res) => {
  try {
    const response = await axios({
      method: 'post',
      url: 'https://accounts.spotify.com/api/token',
      params: {
        grant_type: 'client_credentials',
      },
      headers: {
        'Accept':'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + (new Buffer.from(clientId + ':' + clientSecret).toString('base64')),
      },
    });

    const accessToken = response.data.access_token;

    const nowPlayingResponse = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: {
        'Authorization': 'Bearer ' + accessToken
      },
    });

    res.send(nowPlayingResponse.data);
  } catch (err) {
    console.error(err);
    res.send(err);
  }
});

module.exports = router;
