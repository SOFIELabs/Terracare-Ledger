import os, time, logging, serial
from datetime import datetime

logging.basicConfig(filename='SOFIE_Core.log', level=logging.INFO, format='_ [%(asctime)s] _ %(message)s')

def deploy_capabilities():
    print("--- Initiating 18-Node Deployment ---")
    subdirs = [d for d in os.listdir('.') if os.path.isdir(d) and not d.startswith('.')]
    for folder in subdirs:
        cap_path = os.path.join(folder, 'capability.py')
        with open(cap_path, 'w') as f:
            f.write(f"import logging\ndef pulse():\n    logging.basicConfig(filename='../SOFIE_Core.log', level=logging.INFO)\n    logging.info('Node {folder} Pulse')\nif __name__ == '__main__':\n    pulse()")
        print(f" [+] Capability anchored to {folder}")
    print("--- Deployment Complete ---\n")

def serial_listener():
    print("--- Engaging COM1 Listener (P2P Mesh Bridge) ---")
    try:
        ser = serial.Serial('COM1', 9600, timeout=1)
        print(" [!] COM1 Active. Awaiting Meshtastic metadata...")
        while True:
            if ser.in_waiting:
                cmd = ser.readline().decode('utf-8').strip()
                print(f" [>] Executing: {cmd}")
                os.system(cmd)
    except Exception as e:
        print(f" [!] COM1 Serial Error: {e}")
        print(" [!] Dropping to local standby mode.")

if __name__ == "__main__":
    deploy_capabilities()
    serial_listener()
