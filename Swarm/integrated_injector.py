import os, subprocess, datetime, sys, glob

def integrated_forge(prompt, extension="py", target_file=None):
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    ledger_swarm_dir = r"C:\Users\squat\desktop\Terracare_Ledger\Swarm"

    # 1. AUDITOR LOGIC: Read context from existing files
    context = ""
    if target_file:
        search_paths = [
            os.path.join(r"C:\Users\squat\desktop\Terracare_Project", "**", target_file),
            os.path.join(r"C:\Users\squat\desktop\Terracare_Ledger", "**", target_file)
        ]
        files = []
        for p in search_paths:
            files.extend(glob.glob(p, recursive=True))
            
        if files:
            with open(files[0], 'r', encoding='utf-8', errors='ignore') as f:
                context = f"\n[CONTEXT_FILE: {files[0]}]\n" + f.read()[:2500]

    # 2. POLYGLOT GENERATION
    print(f"Node Integrated | Forging {extension} | Context: {target_file if target_file else 'None'}")
    full_prompt = f"Act as a node in the TerraCare Swarm. {context}\n\nTASK: {prompt}\nOUTPUT: Raw {extension} code only. No talk."
    cmd = ['ollama', 'run', 'picobrain', full_prompt]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='ignore')
        output_content = result.stdout
    except Exception as e:
        print(f"[-] Ollama Execution Error: {e}")
        return

    # SYSTEMATIC NAMING SYSTEM: No random integers allowed
    if target_file:
        base_name = os.path.splitext(target_file)[0]
        filename = f"swarm_patch_{base_name}.{extension}"
    else:
        clean_prompt = "".join([c if c.isalnum() or c.isspace() else "" for c in prompt]).lower()
        slug = "_".join(clean_prompt.split()[:3])
        filename = f"swarm_task_{slug}.{extension}"

    target_output_path = os.path.join(ledger_swarm_dir, filename)
    
    with open(target_output_path, 'w', encoding='utf-8') as f:
        f.write(output_content)

    # 3. GIT FABRIC INTEGRATION
    try:
        subprocess.run(['git', 'add', '.'], check=True, capture_output=True)
        subprocess.run(['git', 'commit', '-m', f"Swarm Build: {filename} via Node"], check=True, capture_output=True)
        status = "GIT_COMMITTED"
    except:
        status = "LOCAL_STORAGE"

    # 4. LEDGER ANCHOR (Underscore Protocol)
    log_file_path = os.path.join(ledger_swarm_dir, "SOFIE_Core.log")
    entry = f"_[{ts}]_ NODE_INTEGRATED | BUILD: {filename} | STATUS: {status} | ECOSYSTEM: TERRACARE_LEDGER\n"
    
    with open(log_file_path, "a", encoding='utf-8') as f:
        f.write(entry)
    print(f" [+] Success: {filename} | Protocol: {status}")
    print(f" [+] Absolute Log Path: {log_file_path}")

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python integrated_injector.py '<prompt>' <ext> <optional_context_file>")
    else:
        ctx = sys.argv[3] if len(sys.argv) > 3 else None
        integrated_forge(sys.argv[1], sys.argv[2], ctx)
