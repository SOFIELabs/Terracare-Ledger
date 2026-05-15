```python
import os
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, mode[4D[K
modes

class Node:
    def __init__(self):
        self.private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
            backend=default_backend()
        )
        self.public_key = self.private_key.public_key()

    def generate_handshake(self):
        # Generate a random session key
        self.session_key = os.urandom(32)

        # Encrypt the session key with the sender's public key
        encrypted_session_key = self.public_key.encrypt(
            self.session_key,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )

        # Return the encrypted session key and the public key for the recip[5D[K
recipient to verify
        return encrypted_session_key, self.public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )

    def receive_handshake(self, encrypted_session_key):
        # Decrypt the session key with the private key
        decrypted_session_key = self.private_key.decrypt(
            encrypted_session_key,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )

        # Return the session key
        return decrypted_session_key

    def encrypt_message(self, message):
        # Pad the message to 128 bits (16 bytes)
        padder = padding.PKCS7(128).padder()
        padded_data = padder.update(message) + padder.finalize()

        # Encrypt the padded data with a random key
        cipher = Cipher(algorithms.AES(self.session_key), modes.CBC(os.uran[17D[K
modes.CBC(os.urandom(16)), backend=default_backend())
        encryptor = cipher.encryptor()
        encrypted_message = encryptor.update(padded_data) + encryptor.final[15D[K
encryptor.finalize()

        return encrypted_message

    def decrypt_message(self, encrypted_message):
        # Decrypt the message with the session key
        cipher = Cipher(algorithms.AES(self.session_key), modes.CBC(os.uran[17D[K
modes.CBC(os.urandom(16)), backend=default_backend())
        decryptor = cipher.decryptor()
        decrypted_padded_data = decryptor.update(encrypted_message) + decry[5D[K
decryptor.finalize()

        # Unpad the data
        unpadder = padding.PKCS7(128).unpadder()
        message = unpadder.update(decrypted_padded_data) + unpadder.finaliz[16D[K
unpadder.finalize()

        return message

node = Node()
handshake_response, public_key = node.generate_handshake()
print(handshake_response)
print(public_key)

decrypted_session_key = node.receive_handshake(handshake_response)
print(decrypted_session_key)

encrypted_message = node.encrypt_message(b"Hello, world!")
print(encrypted_message)

decrypted_message = node.decrypt_message(encrypted_message)
print(decrypted_message)
```

