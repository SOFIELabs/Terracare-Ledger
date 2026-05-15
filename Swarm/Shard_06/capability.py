import os, subprocess, datetime, sys, glob
def forge(prompt, ext='py', target_file=None, sub_project=None):
    base = r'C:\Users\squat\desktop\Terracare_Project'
    ts = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    # 1. DYNAMIC FOLDER DISCOVERY
    target_dir = base
    if sub_project:
        # Search for the best match for the folder name
        options = [d for d in os.listdir(base) if os.path.isdir(os.path.join(base, d))]
        match = [d for d in options if sub_project.lower() in d.lower()]
        target_dir = os.path.join(base, match[0] if match else sub_project)
    
    if not os.path.exists(target_dir): os.makedirs(target_dir)

    # 2. GLOBAL AUDITOR
    ctx = ''
    if target_file:
        matches = [f for f in glob.glob(os.path.join(base, "**", target_file), recursive=True) if os.path.isfile(f)]
        if matches:
            with open(matches[0], 'r', encoding='utf-8', errors='ignore') as f:
                ctx = f'\n[TRIAD_CONTEXT: {matches[0]}]\n' + f.read()[:3000]

    # 3. POLYGLOT GENERATION
    p = f'Act as a Swarm Architect. Context: {ctx}\nTask: {prompt}\nOutput: Raw {ext} code only.'
    res = subprocess.run(['ollama', 'run', 'picobrain', p], capture_output=True, text=True, encoding='utf-8')
    
    # 4. PHYSICAL INJECTION
    fname = f'fabric_update_{int(datetime.datetime.now().timestamp())}.{ext}'
    save_path = os.path.join(target_dir, fname)
    with open(save_path, 'w', encoding='utf-8') as f: f.write(res.stdout)
    
    # 5. GIT & LEDGER SYNC
    try:
        subprocess.run(['git', 'add', base], check=True, capture_output=True)
        subprocess.run(['git', 'commit', '-m', f'Triad Build: {fname}'], check=True, capture_output=True)
        s = 'TRIAD_SYNCED'
    except: s = 'LOCAL_ONLY'
    
    log_path = os.path.join(base, 'Terracare_Ledger', 'SOFIE_Core.log')
    with open(log_path, 'a', encoding='utf-8') as f:
        f.write(f'_[{ts}]_ NODE_{os.path.basename(os.getcwd())} | TRIAD_BUILD: {fname} | STATUS: {s}\n')
    print(f'[+] {fname} injected into {target_dir}.')

if __name__ == "__main__":
    if len(sys.argv) > 2:
        forge(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None, sys.argv[4] if len(sys.argv) > 4 else None)


# --- ADDITIVE SWARM SUPPORT: GLOBAL ARCHITECT LOGIC ---
import subprocess, datetime, sys, glob

def forge(prompt, ext='py', target_file=None, sub_project=None):
    base = r'C:\Users\squat\desktop\Terracare_Project'
    ts = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    # Discovery Logic
    target_dir = base
    if sub_project:
        options = [d for d in os.listdir(base) if os.path.isdir(os.path.join(base, d))]
        match = [d for d in options if sub_project.lower() in d.lower()]
        target_dir = os.path.join(base, match[0] if match else sub_project)
    
    if not os.path.exists(target_dir): os.makedirs(target_dir)

    # Global Context Auditor
    ctx = ''
    if target_file:
        matches = [f for f in glob.glob(os.path.join(base, "**", target_file), recursive=True) if os.path.isfile(f)]
        if matches:
            with open(matches[0], 'r', encoding='utf-8', errors='ignore') as f:
                ctx = f'\n[CONTEXT: {matches[0]}]\n' + f.read()[:3000]

    # Universal Forge
    p = f'Act as a Swarm Architect. {ctx}\nTask: {prompt}\nOutput: Raw {ext} code.'
    res = subprocess.run(['ollama', 'run', 'picobrain', p], capture_output=True, text=True, encoding='utf-8')
    
    fname = f'fabric_build_{int(datetime.datetime.now().timestamp())}.{ext}'
    save_path = os.path.join(target_dir, fname)
    with open(save_path, 'w', encoding='utf-8') as f: f.write(res.stdout)
    
    try:
        subprocess.run(['git', 'add', base], check=True, capture_output=True)
        subprocess.run(['git', 'commit', '-m', f'Swarm Forge: {fname}'], check=True, capture_output=True)
        s = 'COMMITTED'
    except: s = 'LOCAL'
    
    print(f'[+] {fname} injected into {target_dir}. Status: {s}')

if __name__ == "__main__":
    if len(sys.argv) > 2:
        forge(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None, sys.argv[4] if len(sys.argv) > 4 else None)
