import base64
import os
import time
from datetime import datetime

import pytz
import requests
from dotenv import load_dotenv

load_dotenv()

DEBUG = False
GITHUB_TOKEN = os.getenv('GITHUB_TOKEN')
REPO_OWNER = 'D3rhami'
REPO_NAME = 'milli-gold-capture'
DATABASE_PATH = 'database'


def _print(msg):
    if DEBUG:
        print(msg)


def get_tehran_datetime():
    tehran_tz = pytz.timezone('Asia/Tehran')
    return datetime.now(tehran_tz)


def log_error(error_msg):
    try:
        tehran_time = get_tehran_datetime()
        today = tehran_time.strftime('%Y-%m-%d')
        timestamp = tehran_time.strftime('%Y-%m-%d %H:%M:%S')

        log_content = f"[{timestamp}] {error_msg}\n"
        _print(f"Logging error: {log_content.strip()}")

        url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/contents/{DATABASE_PATH}/server.log"
        headers = {
                'Authorization': f'token {GITHUB_TOKEN}',
                'Accept': 'application/vnd.github.v3+json'
        }

        try:
            response = requests.get(url, headers=headers, timeout=30)
            if response.status_code == 200:
                existing_content = base64.b64decode(response.json()['content']).decode('utf-8')
                new_content = existing_content + log_content
                sha = response.json()['sha']
            else:
                new_content = log_content
                sha = None
        except Exception as e:
            _print(f"Error getting existing log: {e}")
            new_content = log_content
            sha = None

        encoded_content = base64.b64encode(new_content.encode('utf-8')).decode('utf-8')

        data = {
                'message': f'Update server.log - {today}',
                'content': encoded_content
        }

        if sha:
            data['sha'] = sha

        log_response = requests.put(url, headers=headers, json=data, timeout=30)
        if log_response.status_code not in [200, 201]:
            _print(f"Failed to log error to GitHub: {log_response.status_code} - {log_response.text}")
    except Exception as e:
        _print(f"Failed to log error: {e}")
        _print(f"Original error was: {error_msg}")


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
        return f'error was {e}'


def get_csv_from_github(filename):
    url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/contents/{DATABASE_PATH}/{filename}"
    headers = {
            'Authorization': f'token {GITHUB_TOKEN}',
            'Accept': 'application/vnd.github.v3+json'
    }

    try:
        _print(f"Fetching CSV from GitHub: {filename}")
        response = requests.get(url, headers=headers, timeout=30)
        _print(f"GitHub GET response: {response.status_code}")

        if response.status_code == 200:
            content = base64.b64decode(response.json()['content']).decode('utf-8')
            sha = response.json()['sha']
            _print(f"Successfully fetched existing CSV with {len(content)} characters")
            return content, sha
        elif response.status_code == 404:
            _print(f"CSV file {filename} doesn't exist yet, will create new one")
            return None, None
        else:
            _print(f"Unexpected response from GitHub: {response.status_code} - {response.text}")
            log_error(f"Error fetching CSV from GitHub: {response.status_code} - {response.text}")
            return None, None
    except Exception as e:
        _print(f"Exception while fetching CSV: {e}")
        log_error(f"Error fetching CSV from GitHub: {e}")
        return None, None


def push_csv_to_github(filename, content, sha=None):
    url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/contents/{DATABASE_PATH}/{filename}"
    headers = {
            'Authorization': f'token {GITHUB_TOKEN}',
            'Accept': 'application/vnd.github.v3+json'
    }

    encoded_content = base64.b64encode(content.encode('utf-8')).decode('utf-8')

    data = {
            'message': f'Update {filename}',
            'content': encoded_content
    }

    if sha:
        data['sha'] = sha
        _print(f"Updating existing file {filename} with SHA: {sha}")
    else:
        _print(f"Creating new file {filename}")

    try:
        _print(f"Pushing CSV to GitHub: {filename}")
        response = requests.put(url, headers=headers, json=data, timeout=30)
        _print(f"GitHub PUT response: {response.status_code}")

        if response.status_code in [200, 201]:
            _print(f"Successfully pushed {filename} to GitHub")
            return True
        else:
            error_msg = f"Failed to push {filename}: {response.status_code} - {response.text}"
            _print(error_msg)
            log_error(error_msg)
            return False
    except Exception as e:
        error_msg = f"Exception pushing CSV to GitHub: {e}"
        _print(error_msg)
        log_error(error_msg)
        return False


def process_gold_data():
    _print(f"Starting gold data processing")

    if not GITHUB_TOKEN:
        error_msg = "GITHUB_TOKEN not found in environment variables"
        _print(error_msg)
        log_error(error_msg)
        return

    gold_data = get_gold_price()

    if isinstance(gold_data, str):
        error_msg = f"Failed to get gold price: {gold_data}"
        _print(error_msg)
        log_error(error_msg)
        return

    _print(f"Retrieved gold data: {gold_data}")

    date_from_api = gold_data['date']
    today = date_from_api.split('T')[0]
    filename = f"{today}.csv"

    existing_content, sha = get_csv_from_github(filename)

    if existing_content is None:
        _print("Creating new CSV file with headers")
        csv_content = "price18,date\n"
    else:
        csv_content = existing_content

    new_row = f"{gold_data['price18']},{gold_data['date']}\n"
    csv_content += new_row
    _print(f"Adding new row: {new_row.strip()}")

    success = push_csv_to_github(filename, csv_content, sha)

    if success:
        _print(f"Successfully processed and pushed data for {today}")
    else:
        error_msg = f"Failed to push data to GitHub for {today}"
        _print(error_msg)
        log_error(error_msg)


def main():
        try:
            process_gold_data()
            time.sleep(60)
        except KeyboardInterrupt:
            _print("Stopping gold price collector...")


if __name__ == "__main__":
    main()
