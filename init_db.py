import sqlite3
conn = sqlite3.connect('C:/Users/squat/Desktop/Terracare_Project/Terracare_Ledger/terracare.db')
cursor = conn.cursor()
cursor.execute('CREATE TABLE IF NOT EXISTS Identities (id TEXT PRIMARY KEY, public_key TEXT NOT NULL)')
cursor.execute('CREATE TABLE IF NOT EXISTS Activities (id TEXT PRIMARY KEY, identity_id TEXT, timestamp TEXT NOT NULL, data TEXT NOT NULL)')
cursor.execute('CREATE TABLE IF NOT EXISTS Records (id TEXT PRIMARY KEY, activity_id TEXT, hash_signature TEXT NOT NULL)')
conn.commit()
conn.close()
print('Sovereign Schema Manifested: Tables Created.')
