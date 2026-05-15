import os

LOG_PATH = r"C:\Users\squat\desktop\Terracare_Project\Terracare_Ledger\Swarm\SOFIE_Core.log"

print("--- SOVEREIGN STRATA AUDIT: 18+1 HIVE ---")
results = {}

with open(LOG_PATH, 'r') as f:
    for line in f:
        if "NODE_" in line and "torus_flow.txt" in line:
            # Extract Node Name (e.g., Monitor_A) and Data
            try:
                node_part = line.split("NODE_")[1].split(" |")[0]
                data_part = line.split("DATA: ")[1].strip()
                results[node_part] = data_part
            except IndexError:
                continue

# Display the Mapping
for node in sorted(results.keys()):
    print(f"Node: {node.ljust(12)} | Value: {results[node]}")

# Identify Drift
values = list(results.values())
if values:
    most_common = max(set(values), key=values.count)
    print(f"\nExpected Consensus: {most_common}")
    for node, val in results.items():
        if val != most_common:
            print(f"!!! DRIFT DETECTED: {node} is reporting {val}")
else:
    print("Error: No toroidal data found in log.")