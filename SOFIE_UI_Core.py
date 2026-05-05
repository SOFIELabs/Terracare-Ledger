from flask import Flask, render_template, jsonify
import os

app = Flask(__name__)
SWARM_PATH = "Swarm"

@app.route('/')
def home(): return render_template('index.html')

@app.route('/api/status')
def status_api():
    nodes = []
    target_prefixes = ("Monitor_", "Shard_", "Trinity_")
    folders = sorted([f for f in os.listdir(SWARM_PATH) if f.startswith(target_prefixes)])
    for f in folders:
        val = "0"
        shard_path = os.path.join(SWARM_PATH, f, "shard_1.shard")
        if os.path.exists(shard_path):
            with open(shard_path, 'r') as file:
                for line in file:
                    if "TRINITY_FREQ" in line: val = line.split(":")[-1].strip()
        nodes.append({"id": f, "val": val})
    return jsonify({"nodes": nodes})

if __name__ == '__main__':
    app.run(port=5000)
