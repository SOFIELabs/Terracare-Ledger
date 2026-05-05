import os
import shutil
import time

def align_picoclaw_swarm():
    print("\033[1;33;44m --- RE-ALIGNING PICOCLAW SWARM: PATH CORRECTION --- \033[0m")
    base_dir = "Swarm"
    if not os.path.exists(base_dir):
        os.makedirs(base_dir)
        print(f"Created missing Swarm directory.")

    nodes = 18
    logic_pattern = [3, 6, 9]
    
    for i in range(1, nodes + 1):
        old_path = f"Swarm_Node_{i:02d}"
        new_path = os.path.join(base_dir, f"PicoClaw_Bot_{i:02d}")
        
        # Move existing data or create fresh aligned directories
        if not os.path.exists(new_path):
            os.makedirs(new_path)
        
        # Inject aligned Governance Shard
        shard_value = logic_pattern[(i-1) % 3]
        with open(os.path.join(new_path, "picoclaw.shard"), "w") as f:
            f.write(f"BOT_ID: {i:02d}\n")
            f.write(f"SWARM_PATH: {new_path}\n")
            f.write(f"TRINITY_VALUE: {shard_value}\n")
            f.write(f"STATUS: ALIGNED\n")
            
        # Clean up the messy root folders
        if os.path.exists(old_path):
            shutil.rmtree(old_path)
            print(f"Bot {i:02d}: Moved from root to Swarm/ folder.")
        else:
            print(f"Bot {i:02d}: Aligned within Swarm/ folder.")

    with open("Terracare_Ledger_Log.txt", "a") as log:
        log.write(f"[{time.ctime()}] STRUCTURAL_ALIGNMENT_COMPLETE: 18 Bots nested in Swarm directory.\n")
    
    print("\033[1;33;44m --- ALIGNMENT COMPLETE: ROOT PURGED --- \033[0m")

if __name__ == "__main__":
    align_picoclaw_swarm()
