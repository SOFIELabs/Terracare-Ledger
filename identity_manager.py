import sqlite3

class IdentityManager:
    def __init__(self):
        self.db_path = 'C:/Users/squat/Desktop/Terracare_Project/Terracare_Ledger/terracare.db'

    def register_node(self, node_id, alias):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        # Mapping our database columns: id = node_id, public_key = alias
        cursor.execute('INSERT OR REPLACE INTO Identities (id, public_key) VALUES (?, ?)', (node_id, alias))
        conn.commit()
        conn.close()
        print(f'Sovereign Identity Linked: {alias}')

    def get_alias(self, node_id):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('SELECT public_key FROM Identities WHERE id = ?', (node_id,))
        result = cursor.fetchone()
        conn.close()
        return result[0] if result else node_id
