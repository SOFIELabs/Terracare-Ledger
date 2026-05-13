import threading
import psutil
import ollama
import time
import random
from flask import Flask, jsonify, request
from flask_cors import CORS

class SOFIE_Brain:
    def __init__(self):
        self.history = [
            {"role": "system", "content": "NEURAL CORE INITIALIZED. 3-6-9 ALIGNED."},
            {"role": "sofie", "content": "Architect Adrian. Absolute alignment locked. Handshake active."}
        ]
        self.audit_trail = ["[BOOT] Ledger Verified."]
        self.task_log = ["[SYSTEM] Project Management Active."]
        self.is_processing = False

    def get_telemetry(self):
        return {
            "ram": psutil.virtual_memory().percent,
            "cpu": psutil.cpu_percent(),
            "f1": random.randint(80, 95),
            "f2": random.randint(50, 70),
            "chat": self.history,
            "audit": self.audit_trail[-15:],
            "tasks": self.task_log[-15:],
            "processing": self.is_processing
        }

    def process_chat(self, text):
        self.is_processing = True
        self.history.append({"role": "architect", "content": text})
        try:
            response = ollama.chat(model='llama3', messages=[
                {'role': 'system', 'content': 'You are S.O.F.I.E., the digitalized female intelligence of the TerraCare Ledger.'},
                {'role': 'user', 'content': text}
            ])
            self.history.append({"role": "sofie", "content": response['message']['content']})
        except Exception as e:
            self.history.append({"role": "system", "content": f"OLLAMA ERROR: {str(e)}"})
        self.is_processing = False

app = Flask(__name__)
CORS(app)
brain = SOFIE_Brain()

@app.route('/pulse')
def pulse(): return jsonify(brain.get_telemetry())

@app.route('/talk', methods=['POST'])
def talk():
    data = request.json
    user_text = data.get("text")
    if user_text:
        threading.Thread(target=brain.process_chat, args=(user_text,)).start()
    return jsonify({"status": "received"})

if __name__ == "__main__":
    app.run(port=5000, debug=False, use_reloader=False)