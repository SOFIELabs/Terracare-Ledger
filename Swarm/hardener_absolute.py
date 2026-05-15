import os
import datetime

def harden_absolute():
    print("--- Hardening 18-Node Protocol: Absolute Pathing ---")
    swarm_dir = os.getcwd()
    log_path = os.path.join(swarm_dir, 'SOFIE_Core.log').replace('\\', '/')
    subdirs = [d for d in os.listdir('.') if os.path.isdir(d) and not d.startswith('.')]
    
    for d in subdirs:
        cap_path = os.path.join(d, 'capability.py')
        code = f"""import datetime
def pulse():
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    entry = f"_[{{ts}}]_ NODE_{d} | PULSE_CONFIRMED | ECOSYSTEM: TERRACARE_LEDGER\\n"
    with open("{log_path}", "a") as f:
        f.write(entry)
    print("Node {d} Pulse Sent to {log_path}")

if __name__ == "__main__":
    pulse()
"""
        with open(cap_path, 'w') as f:
            f.write(code)
        print(f" [!] {d} locked to absolute path.")

if __name__ == "__main__":
    harden_absolute()
