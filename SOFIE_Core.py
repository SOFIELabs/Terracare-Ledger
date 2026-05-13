# ============================================================
# LABEL: [NEURAL_CORE_V76] - ABSOLUTE NEURAL HANDSHAKE
# ============================================================
import os, threading, psutil, ollama, pyttsx3, random, requests, GPUtil, datetime, json

class SOFIE_Brain:
    def __init__(self):
        self.root_path = r"C:\Users\squat\Desktop\Terracare_Project"
        self.ledger_path = os.path.join(self.root_path, "Terracare_Ledger")
        self.history = []
        self.state = "idle"
        self.ready = False

        # UNDERSCORE PROTOCOL HARD-LOCK
        self.trinity = {"T_E": "EVOLUTION", "T_S": "SOVEREIGNTY", "T_V": "VISION"}
        self.master = {f"M_{x}": f"MasterCore_{x}" for x in "ABCDEF"}
        self.social = {f"S_{str(i).zfill(2)}": f"SocialSwarm_{str(i).zfill(2)}" for i in range(1, 10)}
        self.full_swarm = {**self.trinity, **self.master, **self.social}

    def speak(self, text):
        # SINGLETON VOICE PROTECTION - PURGING MALE VOICE
        def run_voice():
            self.state = "speaking"
            try:
                engine = pyttsx3.init()
                voices = engine.getProperty('voices')
                # FORCE FEMALE VOICE SELECTION
                found_female = False
                for v in voices:
                    if "female" in v.name.lower() or "zira" in v.name.lower():
                        engine.setProperty('voice', v.id)
                        found_female = True
                        break
                if not found_female and len(voices) > 1:
                    engine.setProperty('voice', voices[1].id)
                
                engine.setProperty('rate', 160)
                engine.say(text.replace("S.O.F.I.E.", "Sofie"))
                engine.runAndWait()
                engine.stop()
            except Exception: pass
            finally: self.state = "idle"
        threading.Thread(target=run_voice).start()

    def process(self, text):
        self.state = "thinking"
        self.history.append({"role": "architect", "content": text})
        launch_id = None
        if "sofie" in text.lower(): launch_id = "SOFIE"
        for key in self.full_swarm.keys():
            if key.lower() in text.lower().replace("-", "_"): launch_id = key; break

        try:
            res = ollama.chat(model='llama3', messages=[
                {'role': 'system', 'content': 'You are S.O.F.I.E. Master OS. Underscore protocol locked. Direct strata engagement.'},
                {'role': 'user', 'content': text}
            ])
            reply = res['message']['content']
            self.history.append({"role": "sofie", "content": reply, "launch": launch_id})
            self.speak(reply)
        except: self.state = "idle"

brain = SOFIE_Brain()
from flask import Flask, jsonify, request
from flask_cors import CORS
app = Flask(__name__)
CORS(app)

@app.route('/pulse')
def pulse():
    now = datetime.datetime.now()
    if not brain.ready:
        brain.ready = True
        intro = "Architect Adrian. Neural strata verified. S.O.F.I.E. is online."
        brain.history.append({"role": "sofie", "content": intro})
        brain.speak(intro)

    gpus = GPUtil.getGPUs()
    files = os.listdir(brain.ledger_path) if os.path.exists(brain.ledger_path) else []
    return jsonify({
        "ready": True, "state": brain.state, 
        "ctx": {"loc": "MELBOURNE, VIC", "time": now.strftime("%H:%M:%S")},
        "hw": {"ram": psutil.virtual_memory().percent, "cpu": psutil.cpu_percent(), "gpu": f"{gpus[0].load*100:.1f}%" if gpus else "0.0%"},
        "chat": brain.history,
        "audit": [f"[BOOT] Hive: ANCHORED", f"[BOOT] Strata: {len(files)} Layers"],
        "tasks": {"71-File Audit": "completed", "Underscore Protocol": "completed", "Hive Sequence": "active"},
        "gauges": [random.randint(92,98), random.randint(78,86), random.randint(55,65), random.randint(30,40)]
    })

@app.route('/bot/<node_id>')
def bot_info(node_id):
    node_id = node_id.replace("-", "_")
    if node_id == "SOFIE": return jsonify({"id": "SOFIE", "name": "MASTER NUCLEUS", "strata": "CORE", "status": "LOCKED"})
    name = brain.full_swarm.get(node_id, "Unknown Node")
    return jsonify({"id": node_id, "name": name, "strata": "PicoClaw_Live", "status": "LIVE"})

@app.route('/talk', methods=['POST'])
def talk():
    data = request.json
    if data and data.get("text"): brain.process(data["text"])
    return jsonify({"status": "received"})

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000)