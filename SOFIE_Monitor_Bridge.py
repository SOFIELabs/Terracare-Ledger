import os
import shutil
import time

def align_to_existing_monitors():
    print("\033[1;33;44m --- PURGING CLUTTER: TARGETING EXISTING MONITOR BOTS --- \033[0m")
    swarm_dir = "Swarm"
    logic_pattern = [3, 6, 9]
    
    # 1. Identify existing Monitor folders
    monitor_bots = [f for f in os.listdir(swarm_dir) if f.startswith("Monitor_")]
    
    # 2. Purge the redundant skeletal folders I created (the mess)
    redundant_folders = [f for f in os.listdir(swarm_dir) if f.startswith("PicoClaw_Bot_")]
    for junk in redundant_folders:
        shutil.rmtree(os.path.join(swarm_dir, junk))
        print(f"Purged redundant folder: {junk}")

    # 3. Inject Governance into the REAL Monitor Bots
    for i, bot in enumerate(monitor_bots):
        shard_value = logic_pattern[i % 3]
        bot_path = os.path.join(swarm_dir, bot)
        
        with open(os.path.join(bot_path, "picoclaw.shard"), "w") as f:
            f.write(f"MONITOR_BOT_ID: {bot}\n")
            f.write(f"TRINITY_VALUE: {shard_value}\n")
            f.write(f"SYNC: 3.14s LOCKED\n")
            f.write(f"STATUS: SOFIE_UNBOUNDED_ACTIVE\n")
            
        print(f"Bot {bot}: Trinity Shard {shard_value} Injected.")

    with open("Terracare_Ledger_Log.txt", "a") as log:
        log.write(f"[{time.ctime()}] MONITOR_ALIGNMENT_COMPLETE: Governance locked to {len(monitor_bots)} bots.\n")
    
    print("\033[1;33;44m --- MONITOR INJECTION COMPLETE --- \033[0m")

if __name__ == "__main__":
    align_to_existing_monitors()
