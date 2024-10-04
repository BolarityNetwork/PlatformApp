const BASE_URL = `https://api.coinpaprika.com/v1`;

export function fetchCryptos() {
  return fetch(`${BASE_URL}/coins`).then((response) => response.json());
}

export function fetchCryptosFromCoinGecko() {
  return fetch(
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1`
  ).then((response) => response.json());
}

export function fetchCryptoInfo(cryptoId: string) {
  return fetch(
    `https://api.coingecko.com/api/v3/coins/${cryptoId}?localization=false`
  ).then((response) => response.json());
}

export function fetchCryptoTickers(cryptoId: string) {
  return fetch(`${BASE_URL}/tickers/${cryptoId}`).then((response) =>
    response.json()
  );
}

export function fetchMarketChart(cryptoId: string, from: string, to: string) {
  return fetch(`https://api.coingecko.com/api/v3/coins/${cryptoId}/market_chart/range?vs_currency=usd&from=${from}&to=${to}
	`);
}

export function fetchCoinHistory(cryptoId: string, days: string) {
  //const endDate = Math.floor(Date.now() / 1000);
  //const startDate = endDate - 60 * 60 * 24 * 7; //one week ago
  //console.log("endDate: ", endDate, "startDate: ", startDate);
  return fetch(
    `https://api.coingecko.com/api/v3/coins/${cryptoId}/ohlc?vs_currency=usd&days=${days}
		`
  ).then((response) => response.json());
}

export function fetchAllCoinPrice(cryptoSymbols: string | undefined) {
  // const link = `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${cryptoSymbols}&tsyms=USD`;
  return fetch(
    `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${cryptoSymbols}&tsyms=USD`
  ).then((response) => response.json());
}
