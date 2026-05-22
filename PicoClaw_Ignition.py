import os
os.chdir(r'C:\Users\squat\desktop\Terracare_Project\Terracare_Ledger')
import os
import time

def sync_picoclaw_grid():
    swarm_dir = "Swarm"
    logic_pattern = [3, 6, 9]
    
    # Target precisely the Monitor, Shard, and Trinity nodes
    target_prefixes = ("Monitor_", "Shard_", "Trinity_")
    nodes = sorted([
        f for f in os.listdir(swarm_dir) 
        if os.path.isdir(os.path.join(swarm_dir, f)) and f.startswith(target_prefixes)
    ])
    
    print(f"--- ALIGNING PICOCLAW GRID: {len(nodes)} NODES ---")

    for i, bot in enumerate(nodes):
        path = os.path.join(swarm_dir, bot)
        shard_val = logic_pattern[i % 3]
        
        # Inject Sovereign Shard data
        with open(os.path.join(path, "shard_1.shard"), "w") as f:
            f.write(f"BOT_ID: {bot}\nTRINITY_FREQ: {shard_val}\nPI_SYNC: 3.14s LOCKED")
            
        # Inject Trinity Logic data
        with open(os.path.join(path, "trinity_1.logic"), "w") as f:
            f.write(f"RECURSION: {shard_val}-6-9\nOS: SOFIE\nSTATUS: ACTIVE")
            
        print(f"Node [{bot}]: Frequency {shard_val} Locked.")

if __name__ == "__main__":
    sync_picoclaw_grid()

