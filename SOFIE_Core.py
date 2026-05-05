import os, json, requests
import SOFIE_Persona, SOFIE_Swarm, SOFIE_Mesh, SOFIE_Interface

class SOFIESystem:
    def __init__(self):
        with open('SOFIE_Config.json', 'r') as f:
            self.config = json.load(f)
        self.dna = SOFIE_Persona.Persona()
        self.swarm = SOFIE_Swarm.SwarmController(self.config)
        self.ui = SOFIE_Interface.JarvisTUI()
        print(f">>> {self.dna.identity} v6.0 - LIMITLESS STATE ACTIVE")

    def bridge(self, user_in):
        # Audit reality before responding
        status = {repo: "ONLINE" if os.path.exists(path) else "OFFLINE" 
                  for repo, path in self.config['repositories'].items()}
        
        prompt = (f"MANDATE: {self.dna.get_pillar_context()}\n"
                  f"REALITY: {status}\nCOMMAND: {user_in}\n"
                  f"SOFIE: Execute as the Sovereign OS.")
        
        try:
            r = requests.post("http://127.0.0.1:11434/api/generate", 
                             json={"model": "llama3", "prompt": prompt, "stream": False})
            return r.json().get('response')
        except:
            return "BRIDGE_OFFLINE"

if __name__ == "__main__":
    sofie = SOFIESystem()
    # Initial Dashboard Render
    sofie.ui.render_dashboard({"LEDGER": "ONLINE", "ORIANA": "ONLINE"}, {"ACTIVE": 1})
    while True:
        cmd = input(f"[ARCHITECT@MoneyMaker]: ")
        print(f"\n>>> S.O.F.I.E.: {sofie.bridge(cmd)}\n")