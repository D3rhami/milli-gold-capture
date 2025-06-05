#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Generate test data for gold price tracking application.
Creates CSV files with random price data at one-minute intervals.
"""

import os
import csv
import random
import datetime
from pathlib import Path

# Settings
START_DATE = datetime.datetime(2025, 1, 4, 0, 0)  # January 4, 2025 at midnight
END_DATE = datetime.datetime(2025, 6, 3, 23, 59)  # June 3, 2025 at 23:59
OUTPUT_DIR = Path("database")  # Output directory
PRICE_RANGE = (65000, 67000)  # Range for random prices
VOLATILITY = 50  # Maximum price change between minutes

def ensure_directory_exists(directory):
    """Create directory if it doesn't exist."""
    if not os.path.exists(directory):
        os.makedirs(directory)
        print(f"Created directory: {directory}")

def generate_daily_prices(date, previous_price=None):
    """Generate price data for a single day at one-minute intervals."""
    prices = []
    current_time = datetime.datetime(date.year, date.month, date.day, 0, 0)  # Start at midnight
    
    # If no previous price provided, generate a random starting price
    if previous_price is None:
        current_price = random.randint(PRICE_RANGE[0], PRICE_RANGE[1])
    else:
        current_price = previous_price
    
    # Generate a price for each minute of the day
    while current_time.date() == date.date():
        # Add some randomness to the price, with a maximum change of VOLATILITY
        price_change = random.randint(-VOLATILITY, VOLATILITY)
        current_price += price_change
        
        # Ensure price stays within the desired range
        current_price = max(PRICE_RANGE[0], min(current_price, PRICE_RANGE[1]))
        
        # Format datetime as ISO format for compatibility
        timestamp = current_time.isoformat()
        
        prices.append({
            "date": timestamp,
            "price18": current_price
        })
        
        # Move to the next minute
        current_time += datetime.timedelta(minutes=1)
    
    return prices, current_price

def write_daily_data(date, prices):
    """Write price data for a single day to a CSV file."""
    filename = date.strftime("%Y-%m-%d.csv")
    filepath = OUTPUT_DIR / filename
    
    with open(filepath, 'w', newline='') as csvfile:
        fieldnames = ['date', 'price18']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        for price in prices:
            writer.writerow(price)
    
    print(f"Created file: {filepath} with {len(prices)} records")

def generate_test_data():
    """Generate test data for the specified date range."""
    ensure_directory_exists(OUTPUT_DIR)
    
    current_date = START_DATE.date()
    previous_price = None
    
    while current_date <= END_DATE.date():
        print(f"Generating data for {current_date}")
        prices, previous_price = generate_daily_prices(
            datetime.datetime(current_date.year, current_date.month, current_date.day),
            previous_price
        )
        write_daily_data(current_date, prices)
        current_date += datetime.timedelta(days=1)

if __name__ == "__main__":
    print(f"Generating test data from {START_DATE.date()} to {END_DATE.date()}")
    generate_test_data()
    print("Data generation complete.") 