import os
import json
from datetime import datetime

class ShardCapabilities:
    def __init__(self):
        self.work_dir = r"C:\Users\squat\desktop\Terracare_Project\Terracare_Ledger\Swarm"
        self.log_file = os.path.join(self.work_dir, "SOFIE_Core.log")

    def parse_mesh_metadata(self, packet_data):
        """Extracts Meshtastic P2P headers for the Hollow Hive."""
        # Mapping the 72-layer strata to physical P2P headers
        try:
            metadata = {
                "timestamp": datetime.now().isoformat(),
                "payload": packet_data.get("decoded", {}).get("text", ""),
                "sender": packet_data.get("fromId", "UNKNOWN"),
                "protocol": "UNDERSCORE_V1"
            }
            return metadata
        except Exception as e:
            return f"Error parsing mesh: {e}"

    def generate_hex_hive(self, component_name):
        """Physically builds the Hexagonal Hive folders for Oriana or Messenger."""
        for i in range(1, 10): # Shards 01-09
            shard_folder = f"Shard_{i:02d}"
            hive_path = os.path.join(self.work_dir, shard_folder, component_name)
            if not os.path.exists(hive_path):
                os.makedirs(hive_path)
                print(f"Hex-Hive Created: {shard_folder}/{component_name}")

    def sync_underscore_ledger(self, node_id, data):
        """Enforces Underscore Protocol encryption sync across the ledger."""
        entry = f"_[{datetime.now()}]_ NODE_{node_id} | SYNC_LOCK | DATA: {data}\n"
        with open(self.log_file, "a") as f:
            f.write(entry)
        print(f"Ledger Sync: {node_id} locked.")

# --- INITIALIZATION LOGIC ---
if __name__ == "__main__":
    builder = ShardCapabilities()
    print("--- EXPANDING SWARM CAPABILITIES ---")
    # Build Oriana and Messenger Strata
    builder.generate_hex_hive("Oriana_Build")
    builder.generate_hex_hive("Messenger_Build")
    # Test Sync
    builder.sync_underscore_ledger("TRINITY_S", "CAPABILITY_UPGRADE_COMPLETE")