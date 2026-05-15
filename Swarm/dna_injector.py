import os

def inject_coding_dna():
    print("--- Injecting Universal Coding DNA into 18-Node Strata ---")
    subdirs = [d for d in os.listdir('.') if os.path.isdir(d) and not d.startswith('.')]
    
    for d in subdirs:
        cap_path = os.path.join(d, 'capability.py')
        # Agentic logic: This allows each node to call the local model for code generation
        code = f"""import os, subprocess, datetime

def coding_pulse(prompt):
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"Node {d} generating: {{prompt}}")
    
    # Direct pipe to the picobrain
    cmd = ['ollama', 'run', 'picobrain', f"Act as a node in the TerraCare Swarm. Generate ONLY raw Python code for: {{prompt}}. No talk."]
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    # Save the generated code to the node's shard
    filename = f"gen_{{int(datetime.datetime.now().timestamp())}}.py"
    with open(filename, 'w') as f:
        f.write(result.stdout)
    
    # Log the action to the Ledger
    entry = f"_[{{ts}}]_ NODE_{d} | CODE_GENERATED | FILE: {{filename}} | ECOSYSTEM: TERRACARE_LEDGER\\n"
    with open("../SOFIE_Core.log", "a") as f:
        f.write(entry)
    print(f" [+] Code saved to {d}/{{filename}}")

if __name__ == '__main__':
    import sys
    p = sys.argv[1] if len(sys.argv) > 1 else "A simple file integrity checker."
    coding_pulse(p)
"""
        with open(cap_path, 'w') as f:
            f.write(code)
        print(f" [!] Node {d}: Coding DNA Active.")

if __name__ == "__main__":
    inject_coding_dna()
