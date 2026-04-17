import sqlite3
def sign_record(record):
    return hashlib.sha256(str(record).encode()).hexdigest()

conn = sqlite3.connect('terracare.db')
conn.execute('''CREATE TABLE Identities
        (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL
        );''')
conn.execute('''CREATE TABLE Activities
        (
            id TEXT PRIMARY KEY,
            idenity_id TEXT REFERENCES Identities(id),
            timestamp DATE NOT NULL,
            data TEXT NOT NULL
        );''')
conn.execute('''CREATE TABLE Records
        (
            id TEXT PRIMARY KEY,
            activity_id TEXT REFERENCES Activities(id),
            record_data TEXT NOT NULL
        );''')
conn.commit()
close_db()