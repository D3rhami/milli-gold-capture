from flask import Flask, render_template, jsonify
import pandas as pd
import os
from datetime import datetime, timedelta
import pytz

app = Flask(__name__)

def get_latest_data():
    database_dir = "database"
    # Get the most recent CSV file
    csv_files = [f for f in os.listdir(database_dir) if f.endswith('.csv') and f != 'server.log']
    if not csv_files:
        return pd.DataFrame()
    
    latest_file = max(csv_files)
    df = pd.read_csv(os.path.join(database_dir, latest_file))
    df['date'] = pd.to_datetime(df['date'])
    return df

@app.route('/')
def index():
    df = get_latest_data()
    if df.empty:
        return "No data available"
    
    latest_price = df['price18'].iloc[-1]
    min_price = df['price18'].min()
    max_price = df['price18'].max()
    latest_update = df['date'].iloc[-1]
    
    return render_template('index.html',
                         latest_price=latest_price,
                         min_price=min_price,
                         max_price=max_price,
                         latest_update=latest_update)

@app.route('/api/data')
def get_data():
    df = get_latest_data()
    if df.empty:
        return jsonify([])
    
    data = df.to_dict(orient='records')
    return jsonify(data)

if __name__ == '__main__':
    app.run(debug=True) 