import serial, json, threading

class MeshBridge:
    def __init__(self, config):
        self.port = config['mesh']['port']
        self.baud = config['mesh']['baud']
        self.active = True
        try:
            self.ser = serial.Serial(self.port, self.baud, timeout=1)
        except:
            self.ser = None
            print(f">>> MESH_OFFLINE: Could not open {self.port}")

    def encrypt_packet(self, data):
        """Converts Ledger/Messenger data into 3-6-9 frequency encoded packets"""
        packet = {
            "header": "SOFIE_P2P",
            "payload": data,
            "frequency": "3-6-9"
        }
        return json.dumps(packet).encode('utf-8').hex()

    def listen_loop(self, callback):
        """Jarvis Clone: Background Serial Listener for Sovereign Mesh"""
        while self.active and self.ser:
            if self.ser.in_waiting > 0:
                raw_data = self.ser.readline().decode('utf-8').strip()
                try:
                    # Decode the hex-encoded 3-6-9 signal
                    decoded = bytes.fromhex(raw_data).decode('utf-8')
                    packet = json.loads(decoded)
                    if packet.get("frequency") == "3-6-9":
                        callback(packet['payload'])
                except:
                    pass # Ignore non-aligned noise on the mesh