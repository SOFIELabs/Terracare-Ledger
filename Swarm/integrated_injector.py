import os, subprocess, datetime, sys, glob

def integrated_forge(prompt, extension="py", target_file=None):
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    root_dir = r"C:\Users\squat\desktop\Terracare_Project"
    
    # 1. AUDITOR LOGIC: Read context from existing files
    context = ""
    if target_file:
        search_path = os.path.join(root_dir, "**", target_file)
        files = glob.glob(search_path, recursive=True)
        if files:
            with open(files[0], 'r', encoding='utf-8', errors='ignore') as f:
                context = f"\n[CONTEXT_FILE: {files[0]}]\n" + f.read()[:2500]

    # 2. POLYGLOT GENERATION
    print(f"Node Integrated | Forging {extension} | Reading Context: {target_file if target_file else 'None'}")
    full_prompt = f"Act as a node in the TerraCare Swarm. {context}\n\nTASK: {prompt}\nOUTPUT: Raw {extension} code only. No talk."
    cmd = ['ollama', 'run', 'picobrain', full_prompt]
    result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='ignore')
    
    filename = f"swarm_build_{int(datetime.datetime.now().timestamp())}.{extension}"
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(result.stdout)
    
    # 3. GIT FABRIC INTEGRATION
    try:
        subprocess.run(['git', 'add', '.'], check=True, capture_output=True)
        subprocess.run(['git', 'commit', '-m', f"Swarm Build: {filename} via Node"], check=True, capture_output=True)
        status = "GIT_COMMITTED"
    except:
        status = "LOCAL_STORAGE"

    # 4. LEDGER ANCHOR (Underscore Protocol)
    entry = f"_[{ts}]_ NODE_INTEGRATED | BUILD: {filename} | STATUS: {status} | ECOSYSTEM: TERRACARE_LEDGER\n"
    with open(os.path.join(os.getcwd(), "../SOFIE_Core.log"), "a", encoding='utf-8') as f:
        f.write(entry)
    print(f" [+] Success: {filename} | Protocol: {status}")

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python capability.py '<prompt>' <ext> <optional_context_file>")
    else:
        ctx = sys.argv[3] if len(sys.argv) > 3 else None
        integrated_forge(sys.argv[1], sys.argv[2], ctx)
