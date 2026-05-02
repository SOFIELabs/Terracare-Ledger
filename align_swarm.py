import os
import shutil

base = 'C:/Users/squat/Desktop/Terracare_Project/Terracare_Ledger/Swarm'
# The full, verified 18-agent roster
names = [
    'Monitor_A', 'Monitor_B', 'Monitor_C', 'Monitor_D', 'Monitor_E', 'Monitor_F',
    'Shard_01', 'Shard_02', 'Shard_03', 'Shard_04', 'Shard_05', 'Shard_06', 
    'Shard_07', 'Shard_08', 'Shard_09', 
    'Trinity_S', 'Trinity_V', 'Trinity_E'
]

def align():
    print("--- Initiating Professional Swarm Alignment ---")
    for i, name in enumerate(names):
        old_path = os.path.join(base, f'Bot_{i+1:02d}')
        new_path = os.path.join(base, name)
        
        # 1. Handle the Rename
        if os.path.exists(old_path):
            try:
                shutil.move(old_path, new_path)
                print(f"[OK] Renamed Bot_{i+1:02d} -> {name}")
            except Exception as e:
                print(f"[ERROR] Could not rename Bot_{i+1:02d}: {e}")
        elif os.path.exists(new_path):
            print(f"[INFO] {name} already exists.")
        else:
            os.makedirs(new_path, exist_ok=True)
            print(f"[NEW] Created directory for {name}")

        # 2. Inject Sovereign Manifest Logic
        manifest_path = os.path.join(new_path, 'manifest.txt')
        manifest_content = (
            f"ID: {i+1:02d}\n"
            f"Name: {name}\n"
            f"Status: Online_Active\n"
            f"Bridge: Trinity_Aligned\n"
            f"Consensus: Synchronized"
        )
        with open(manifest_path, 'w') as f:
            f.write(manifest_content)

    print("--- Swarm Fully Aligned: Monitor, Shard, and Trinity Clusters Locked ---")

if __name__ == "__main__":
    align()