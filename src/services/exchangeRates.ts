import { Record, Number } from 'runtypes';
import { request as fetch } from 'undici';

const API_URL = 'https://min-api.cryptocompare.com/data/price';

// TODO: add caching

export function getExchangeRate(ticker: string) {
    const params = new URLSearchParams();
    params.append('fsym', 'USD');
    params.append('tsyms', ticker);
    
    const ExpectedResponse = Record({
        [ticker]: Number,
    });

    return fetch(`${API_URL}?${params.toString()}`)
        .then((data) => data.body.json())
        .then((data) => ExpectedResponse.check(data)[ticker]);
}
