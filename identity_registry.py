import json
def register_user(p2p_id):
    with open('registry.json', 'r+') as f:
        registry = json.load(f)
        registry[p2p_id] = {}
        f.seek(0)
        json.dump(registry, f)
        f.truncate()


def verify_hash(hash_value):
    return hash_value in [v['hash'] for v in get_registry().values()]


def log_activity(p2p_id, activity):
    with open('registry.json', 'r+') as f:
        registry = json.load(f)
        if p2p_id not in registry:
            registry[p2p_id] = {}
        registry[p2p_id]['log'].append(activity)
        f.seek(0)
        json.dump(registry, f)
        f.truncate()


def get_registry():
    with open('registry.json', 'r') as f:
        return json.load(f)

