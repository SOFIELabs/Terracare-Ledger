```python
import hashlib
from typing import Dict, List

class Message:
    def __init__(self, sender: str, recipient: str, payload: str):
        self.sender = sender
        self.recipient = recipient
        self.payload = payload
        self.signature = hashlib.sha256((sender + recipient + payload).enco[13D[K
payload).encode()).hexdigest()

class Node:
    def __init__(self, id: str):
        self.id = id
        self.peers = {}
        self.messages = {}

    def add_peer(self, peer_id: str, peer_node: 'Node'):
        self.peers[peer_id] = peer_node

    def remove_peer(self, peer_id: str):
        if peer_id in self.peers:
            del self.peers[peer_id]

    def relay_message(self, message: Message):
        if self.id == message.sender:
            # If the message is from this node, add it to the messages dict[4D[K
dictionary
            self.messages[message.signature] = (message.recipient, message.[8D[K
message.payload)
        else:
            for peer in self.peers.values():
                peer.relay_message(message)

    def get_messages(self) -> Dict[str, List[Tuple[str, str]]]:
        return {sig: (recipient, payload) for sig, (recipient, payload) in [K
self.messages.items() if sig.startswith(self.id[:2])}


class Swarm:
    def __init__(self):
        self.nodes = {}

    def add_node(self, node_id: str, node: Node):
        self.nodes[node_id] = node

    def remove_node(self, node_id: str):
        if node_id in self.nodes:
            del self.nodes[node_id]

    def relay_message(self, message: Message):
        for node in self.nodes.values():
            node.relay_message(message)


# Example usage
swarm = Swarm()
node1 = Node('0000')
node2 = Node('1111')
swarm.add_node(node1.id, node1)
swarm.add_node(node2.id, node2)

node1.add_peer(node2.id, node2)
node2.add_peer(node1.id, node1)

message = Message('0000', '1111', 'Hello, world!')
swarm.relay_message(message)

for sig, (recipient, payload) in node1.get_messages().items():
    print(f"Message from {sig} to {recipient}: {payload}")
```

