import os
import shutil
import time

def flatten_and_sync_monitors():
    print("\033[1;33;44m --- FLATTENING STRUCTURE: SYNCING 18 MONITOR BOTS --- \033[0m")
    swarm_dir = "Swarm"
    logic_pattern = [3, 6, 9]
    
    # Identify all existing Monitor folders
    monitor_bots = [f for f in os.listdir(swarm_dir) if f.startswith("Monitor_")]
    
    for i, bot in enumerate(monitor_bots):
        bot_path = os.path.join(swarm_dir, bot)
        shard_value = logic_pattern[i % 3]
        
        # 1. PURGE redundant "Bot_X" subfolders created by previous error
        for item in os.listdir(bot_path):
            item_path = os.path.join(bot_path, item)
            if os.path.isdir(item_path) and "Bot" in item:
                shutil.rmtree(item_path)
                print(f"Purged redundant subfolder from {bot}")

        # 2. INJECT Shards directly into the Monitor root
        with open(os.path.join(bot_path, "shard_1.shard"), "w") as f:
            f.write(f"MONITOR_ID: {bot}\nTRINITY_SHARD: {shard_value}\n")
        
        with open(os.path.join(bot_path, "trinity_1.logic"), "w") as f:
            f.write(f"RECURSION_STATE: ACTIVE\nHEARTBEAT: 3.14s\n")
            
        print(f"Bot {bot}: Synchronized with shard_1 and trinity_1 (Value: {shard_value}).")

    print("\033[1;33;44m --- ALL 18 NODES ALIGNED AND FLATTENED --- \033[0m")

if __name__ == "__main__":
    flatten_and_sync_monitors()
