import os

def inject_utf8_dna():
    print("--- Hardening Swarm DNA: UTF-8 Encoding Lock ---")
    subdirs = [d for d in os.listdir('.') if os.path.isdir(d) and not d.startswith('.')]
    
    for d in subdirs:
        cap_path = os.path.join(d, 'capability.py')
        code = f"""import os, subprocess, datetime

def coding_pulse(prompt):
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"Node {d} generating build for: {{prompt}}")
    
    # Direct pipe to picobrain with explicit UTF-8 decoding
    cmd = ['ollama', 'run', 'picobrain', f"Act as a node in the TerraCare Swarm. Generate ONLY raw Python code for: {{prompt}}. No talk."]
    
    # We force capture with utf-8 to bypass the cp1252 crash
    result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='ignore')
    
    filename = f"gen_{{int(datetime.datetime.now().timestamp())}}.py"
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(result.stdout)
    
    entry = f"_[{{ts}}]_ NODE_{d} | CODE_GENERATED | FILE: {{filename}} | ECOSYSTEM: TERRACARE_LEDGER\\n"
    with open("../SOFIE_Core.log", "a", encoding='utf-8') as f:
        f.write(entry)
    print(f" [+] Build successful: {d}/{{filename}}")

if __name__ == '__main__':
    import sys
    p = sys.argv[1] if len(sys.argv) > 1 else "A basic file integrity checker."
    coding_pulse(p)
"""
        with open(cap_path, 'w', encoding='utf-8') as f:
            f.write(code)
        print(f" [!] Node {d} re-aligned.")

if __name__ == "__main__":
    inject_utf8_dna()
