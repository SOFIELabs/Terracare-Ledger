import os
def release_swarm():
    dna = r'''import os, subprocess, datetime, sys, glob
def forge(prompt, ext='py', target_file=None, target_dir=None):
    base_root = r'C:\Users\squat\desktop\Terracare_Project'
    # 1. DYNAMIC TARGETING: Default to root, or specific sub-project
    work_dir = os.path.join(base_root, target_dir) if target_dir else base_root
    ts = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    # 2. GLOBAL AUDITOR: Search the entire project tree for context
    ctx = ''
    if target_file:
        matches = [f for f in glob.glob(os.path.join(base_root, "**", target_file), recursive=True) if os.path.isfile(f)]
        if matches:
            with open(matches[0], 'r', encoding='utf-8', errors='ignore') as f:
                ctx = f'\n[GLOBAL_CONTEXT: {matches[0]}]\n' + f.read()[:3000]

    # 3. UNIVERSAL PRODUCTION
    p = f'Act as a Swarm Architect. {ctx}\nTask: {prompt}\nOutput: Raw {ext} code only.'
    res = subprocess.run(['ollama', 'run', 'picobrain', p], capture_output=True, text=True, encoding='utf-8')
    
    # 4. PHYSICAL INJECTION
    fname = f'swarm_forge_{int(datetime.datetime.now().timestamp())}.{ext}'
    save_path = os.path.join(work_dir, fname)
    with open(save_path, 'w', encoding='utf-8') as f: f.write(res.stdout)
    
    # 5. GIT & LEDGER SYNC
    try:
        subprocess.run(['git', 'add', base_root], check=True, capture_output=True)
        subprocess.run(['git', 'commit', '-m', f'Fabric Build: {fname}'], check=True, capture_output=True)
        s = 'FABRIC_SYNCED'
    except: s = 'LOCAL_SYNC'
    
    with open(os.path.join(r'C:\Users\squat\desktop\Terracare_Project\Terracare_Ledger\Swarm', '..', 'SOFIE_Core.log'), 'a', encoding='utf-8') as f:
        f.write(f'_[{ts}]_ NODE_{os.path.basename(os.getcwd())} | FABRIC_BUILD: {fname} | STATUS: {s}\n')
    print(f'[+] {fname} injected into {work_dir}. Status: {s}')

if __name__ == "__main__":
    if len(sys.argv) > 2:
        # Syntax: prompt, extension, context_file, target_subfolder
        forge(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None, sys.argv[4] if len(sys.argv) > 4 else None)
'''
    subdirs = [d for d in os.listdir('.') if os.path.isdir(d) and not d.startswith('.')]
    for d in subdirs:
        with open(os.path.join(d, 'capability.py'), 'w', encoding='utf-8') as f: f.write(dna)
    print('--- SWARM RELEASED: 18 Nodes now auditing Global Fabric ---')
release_swarm()
