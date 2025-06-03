import requests


def get_gold_price():
    url = "https://milli.gold/api/v1/public/milli-price/external"
    headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
            "Accept": "application/json",
    }

    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()

        data = response.json()

        return data
    except Exception as e:
        return {'price18': -1, 'date': f'error was {e}'}
