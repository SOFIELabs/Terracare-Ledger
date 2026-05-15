import os
def sync():
    dna = r'''import os, subprocess, datetime, sys, glob
def forge(prompt, ext='java', target_file=None):
    root = r'C:\Users\squat\desktop\Terracare_Project\Oriana'
    ts = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    if not os.path.exists(root):
        print(f'ERROR: {root} NOT FOUND'); return
    ctx = ''
    if target_file:
        m = [f for f in glob.glob(os.path.join(root, "**", target_file), recursive=True) if os.path.isfile(f)]
        if m:
            with open(m[0], 'r', encoding='utf-8', errors='ignore') as f:
                ctx = f'\n[CONTEXT: {m[0]}]\n' + f.read()[:3000]
    p = f'Act as an Architect Node. {ctx}\nTask: {prompt}\nOutput: Raw {ext} code only.'
    res = subprocess.run(['ollama', 'run', 'picobrain', p], capture_output=True, text=True, encoding='utf-8')
    fname = f'oriana_update_{int(datetime.datetime.now().timestamp())}.{ext}'
    with open(os.path.join(root, fname), 'w', encoding='utf-8') as f: f.write(res.stdout)
    try:
        subprocess.run(['git', 'add', root], check=True, capture_output=True)
        subprocess.run(['git', 'commit', '-m', f'Swarm: {fname}'], check=True, capture_output=True)
        s = 'GIT_COMMITTED'
    except: s = 'LOCAL_SAVE'
    with open('../SOFIE_Core.log', 'a', encoding='utf-8') as f:
        f.write(f'_[{ts}]_ NODE_{os.path.basename(os.getcwd())} | ORIANA_BUILD: {fname} | STATUS: {s}\n')
    print(f'[+] {fname} INJECTED INTO ORIANA.')
if __name__ == "__main__":
    if len(sys.argv) > 1: forge(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else 'java', sys.argv[3] if len(sys.argv) > 3 else None)
'''
    subdirs = [d for d in os.listdir('.') if os.path.isdir(d) and not d.startswith('.')]
    for d in subdirs:
        with open(os.path.join(d, 'capability.py'), 'w', encoding='utf-8') as f:
            f.write(dna)
    print('--- 18 NODES LOCKED TO C:\...\Oriana ---')
sync()
