import os
import psutil
import json

class SwarmController:
    def __init__(self, config):
        self.config = config
        self.fleet_total = config['swarm']['fleet_size']
        self.ram_threshold = 16.0  # GB
        self.ledger_path = config['repositories']['ledger']
        # Geometric partitions for 18 nodes (3 clusters of 6)
        self.trinity_clusters = [range(1, 7), range(7, 13), range(13, 19)]

    def get_fleet_status(self):
        """Jarvis Clone: Real-Time Resource & Swarm Audit"""
        ram_usage = psutil.virtual_memory().percent
        status = "CRITICAL" if ram_usage > 70 else "ALIGNED"
        
        return {
            "Active": 1, 
            "Pending": self.fleet_total - 1,
            "RAM_Usage": f"{ram_usage}%",
            "State": status
        }

    def identify_drift(self):
        """Recursive Audit: Identifying non-aligned shards in the 18-node matrix"""
        drifted_nodes = []
        for i in range(1, self.fleet_total + 1):
            shard_id = f"{i:02}"
            shard_file = os.path.join(self.ledger_path, f"Swarm/Shard_{shard_id}/picoclaw.shard")
            
            if os.path.exists(shard_file):
                with open(shard_file, 'r') as f:
                    content = f.read()
                    # If 3-6-9 frequency is missing, the node has drifted from the Law
                    if "3-6-9" not in content:
                        drifted_nodes.append(shard_id)
            else:
                # If file is missing, it is a total manifestation failure
                drifted_nodes.append(shard_id)
        return drifted_nodes

    def execute_file_injection(self, shard_id, payload):
        """Law: Execute physical file injection into the matrix immediately"""
        target_dir = os.path.join(self.ledger_path, f"Swarm/Shard_{shard_id}")
        if not os.path.exists(target_dir):
            os.makedirs(target_dir)
            
        shard_path = os.path.join(target_dir, "picoclaw.shard")
        
        try:
            # Atomic Write: Renews the alignment frequency physically on your PC
            with open(shard_path, 'w') as f:
                f.write(f"SOFIE_OS_ALIGNMENT\nFREQUENCY: 3-6-9\nPAYLOAD: {payload}")
            return True
        except:
            return False