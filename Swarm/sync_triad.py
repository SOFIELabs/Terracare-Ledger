import os
def synchronize_triad():
    dna = r'''import os, subprocess, datetime, sys, glob
def forge(prompt, ext='py', target_file=None, sub_project=None):
    # THE TRIAD ROOTS
    base = r'C:\Users\squat\desktop\Terracare_Project'
    ledger_root = os.path.join(base, 'Terracare_Ledger')
    oriana_root = os.path.join(base, 'Oriana')
    messenger_root = os.path.join(base, 'Terracare_Messenger')
    
    # 1. DYNAMIC TARGETING
    target_dir = os.path.join(base, sub_project) if sub_project else base
    ts = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    # 2. TRIAD AUDITOR: Scan all three pillars for context
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
    
    with open(os.path.join(ledger_root, 'Swarm', '..', 'SOFIE_Core.log'), 'a', encoding='utf-8') as f:
        f.write(f'_[{ts}]_ NODE_{os.path.basename(os.getcwd())} | TRIAD_BUILD: {fname} | STATUS: {s}\n')
    print(f'[+] {fname} injected into {target_dir}.')

if __name__ == "__main__":
    if len(sys.argv) > 2:
        # prompt, ext, context_file, sub_project_folder
        forge(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None, sys.argv[4] if len(sys.argv) > 4 else None)
'''
    subdirs = [d for d in os.listdir('.') if os.path.isdir(d) and not d.startswith('.')]
    for d in subdirs:
        with open(os.path.join(d, 'capability.py'), 'w', encoding='utf-8') as f: f.write(dna)
    print('--- TRIAD DNA ACTIVE: 18 Nodes now meshing Ledger, Oriana, and Messenger ---')
synchronize_triad()
