import nconf from 'nconf';

nconf.argv().env().file('config.json');

const { apiKey: telegramApiKey } = nconf.get('telegram');

export {
    telegramApiKey,
};
