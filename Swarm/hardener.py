import os
import datetime

def harden():
    print("--- Hardening 18-Node Protocol ---")
    # Identify the 18 nodes (Monitor, Shard, Trinity)
    subdirs = [d for d in os.listdir('.') if os.path.isdir(d) and not d.startswith('.')]
    
    for d in subdirs:
        cap_path = os.path.join(d, 'capability.py')
        # The rigid Underscore Protocol template
        code = f"""import datetime
def pulse():
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    entry = f"_[{{ts}}]_ NODE_{d} | PULSE_CONFIRMED | ECOSYSTEM: TERRACARE_LEDGER\\n"
    with open("../SOFIE_Core.log", "a") as f:
        f.write(entry)
    print("Node {d} Pulse Sent.")

if __name__ == "__main__":
    pulse()
"""
        with open(cap_path, 'w') as f:
            f.write(code)
        print(f" [!] {d} secured.")

if __name__ == "__main__":
    harden()
