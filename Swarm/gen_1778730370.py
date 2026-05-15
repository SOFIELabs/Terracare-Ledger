```python
import json
from terracare.swarm import SwarmNode, Ledger

class JavaBridge:
    def __init__(self):
        self.node = SwarmNode()
        self.ledger = Ledger(self.node)

    def get_last_entries(self, count=10):
        response = self.ledger.get_entries(count=count)
        return json.loads(response.content.decode('utf-8'))['entries']

java_bridge = JavaBridge()
last_entries = java_bridge.get_last_entries(count=10)
print(last_entries)
```

