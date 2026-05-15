```python
import os
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, mode[4D[K
modes
from cryptography.hazmat.backends import default_backend

def encrypt_file(key, filename):
    # Generate a random 128-bit IV.
    iv = os.urandom(16)
    
    # Create a new AES-CBC cipher object with the given key and IV.
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_bac[19D[K
backend=default_backend())
    
    # Encrypt the file in chunks.
    encryptor = cipher.encryptor()
    with open(filename, 'rb') as f:
        padder = padding.PKCS7(128).padder()
        padded_data = padder.update(f.read()) + padder.finalize()
        
        ct = encryptor.update(padded_data) + encryptor.finalize()
    
    # Return the IV and the ciphertext.
    return iv + ct

def main():
    # Load the key from a file (in hex)
    with open('key.bin', 'rb') as f:
        key = bytes.fromhex(f.read().hex())
        
    # Encrypt all files in the current directory.
    for filename in os.listdir('.'):
        if filename.endswith('.txt'):
            ct = encrypt_file(key, filename)
            
            # Write the IV and ciphertext to a new file.
            with open('enc-' + filename, 'wb') as f:
                f.write(ct)

if __name__ == "__main__":
    main()
```

