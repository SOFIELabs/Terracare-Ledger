import sqlite3
import hashlib
from datetime import datetime

def log_event(user_id, event_type, data):
    conn = sqlite3.connect('C:/Users/squat/Desktop/Terracare_Project/Terracare_Ledger/terracare.db')
    cursor = conn.cursor()
    timestamp = datetime.now().isoformat()
    record_data = {'user_id': user_id, 'event_type': event_type, 'data': data, 'timestamp': timestamp}
    record_hash = hashlib.sha256(str(record_data).encode('utf-8')).hexdigest()
    cursor.execute('INSERT INTO Records (id, activity_id, hash_signature) VALUES (?, ?, ?)', (record_hash, event_type, record_hash))
    conn.commit()
    conn.close()
    print(f'Sovereign Event Logged: {record_hash[:10]}...')

if __name__ == '__main__':
    log_event('ARCHITECT_01', 'INITIALIZATION', 'P2P Bridge Active')
