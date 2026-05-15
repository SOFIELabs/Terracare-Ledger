```python
def caesar_cipher(text, shift):
    encrypted_text = ""
    for char in text:
        if char.isalpha():
            ascii_offset = 65 if char.isupper() else 97
            encrypted_char = chr((ord(char) - ascii_offset + shift) % 26 + [K
ascii_offset)
            encrypted_text += encrypted_char
        else:
            encrypted_text += char
    return encrypted_text

def encrypt_file(input_filename, output_filename, shift):
    with open(input_filename, "r") as input_file:
        text = input_file.read()
    
    encrypted_text = caesar_cipher(text, shift)
    
    with open(output_filename, "w") as output_file:
        output_file.write(encrypted_text)

encrypt_file("input.txt", "output.txt", 3)
```

