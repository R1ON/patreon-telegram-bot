import { fastify } from 'fastify';
import { init } from './init';
import { init as initTelegram } from './telegram';

const HOST = 'https://2b22-147-30-14-186.ngrok.io';

async function run() {
    init();

    const app = fastify();

    await initTelegram(HOST, app);

    // 5000 порт занят. Поэтому 5002
    // https://stackoverflow.com/questions/70247195/flask-ngrok-access-to-subdomain-ngrok-io-was-denied-403-error
    app.listen(5002, async (err, address) => {
        if (err) {
            throw err;
        }
        console.log('Listening...', address);
    });
}

run();
