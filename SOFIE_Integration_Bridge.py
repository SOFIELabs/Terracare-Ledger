import os
import time

# Gold-Etched Navy Blue CSS Protocol
CSS_PAYLOAD = """
/* Oriana Dashboard Style */
body { background-color: #000080; color: #D4AF37; font-family: 'Segoe UI', serif; }
.gold-etched { border: 2px solid #D4AF37; padding: 20px; box-shadow: 0 0 15px #D4AF37; }
.node-status { color: #D4AF37; text-transform: uppercase; letter-spacing: 2px; }
"""

def sync_swarm_metadata():
    nodes = 18
    print(f"Linking metadata for {nodes} nodes...")
    for i in range(1, nodes + 1):
        shard_path = f"Swarm_Node_{i:02d}"
        if not os.path.exists(shard_path):
            os.makedirs(shard_path)
        print(f"Node {i:02d}: Locked to Trinity Governance.")

def initiate_pi_sync():
    heartbeat = 3.14159
    # Initial log entry to confirm activation
    with open("Terracare_Ledger_Log.txt", "a") as f:
        f.write(f"[{time.ctime()}] SOFIE_IGNITION: Standalone Representation Active.\n")
    
    print("Heartbeat loop started. Press Ctrl+C to stop.")
    while True:
        with open("Terracare_Ledger_Log.txt", "a") as f:
            f.write(f"[{time.ctime()}] SOFIE_HEARTBEAT: Pulse confirmed at {heartbeat}s\n")
        time.sleep(3.14)

if __name__ == "__main__":
    with open("oriana_style.css", "w") as f:
        f.write(CSS_PAYLOAD)
    sync_swarm_metadata()
    initiate_pi_sync()
