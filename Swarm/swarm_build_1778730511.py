Here's a revised `SOFIE_MetadataValidator` class that enhances metadata han[3D[K
handling:
```python
import os
from hashlib import sha256

class SOFIE_MetadataValidator:
    def __init__(self, root_path):
        self.root_path = root_path
        self.metadata_dir = os.path.join(self.root_path, "Metadata")
        self.validator_cache = {}

    def get_metadata_hash(self, filename):
        """Generate a SHA-256 hash of the metadata file"""
        filepath = os.path.join(self.metadata_dir, filename)
        if filepath not in self.validator_cache:
            with open(filepath, 'rb') as f:
                metadata = f.read()
                self.validator_cache[filepath] = sha256(metadata).hexdigest[26D[K
sha256(metadata).hexdigest()
        return self.validator_cache[filepath]

    def validate_metadata(self, filename):
        """Verify the integrity of the metadata file using its hash"""
        expected_hash = self.get_metadata_hash(filename)
        actual_hash = sha256(open(os.path.join(self.metadata_dir, filename)[9D[K
filename), 'rb').read()).hexdigest()
        if expected_hash == actual_hash:
            return True
        else:
            raise ValueError(f"Metadata validation failed for {filename}")

    def update_validator_cache(self):
        """Regenerate the validator cache after metadata updates"""
        self.validator_cache = {}
        for root, dirs, files in os.walk(self.metadata_dir):
            for file in files:
                if file not in self.validator_cache:
                    filepath = os.path.join(root, file)
                    with open(filepath, 'rb') as f:
                        self.validator_cache[filepath] = sha256(f.read()).h[18D[K
sha256(f.read()).hexdigest()

    def ping_node(self, node_id):
        """Validate the P2P mesh by checking metadata consistency"""
        try:
            node_metadata_hash = self.get_metadata_hash(node_id + ".metadat[9D[K
".metadata")
            if node_metadata_hash in self.validator_cache.values():
                return True
            else:
                raise ValueError(f"Invalid metadata for {node_id}")
        except (ValueError, KeyError):
            raise ValueError(f"P2P mesh validation failed for {node_id}")
```
This revised class uses a cache to store the SHA-256 hash of each metadata [K
file and verifies the integrity of the metadata by comparing the stored has[3D[K
hash with the recalculated one. The `update_validator_cache` method regener[7D[K
regenerates the cache after metadata updates.

Note that this implementation assumes a directory structure where each node[4D[K
node's metadata is stored in a separate file named `<node_id>.metadata`. Yo[2D[K
You may need to adjust the code to match your specific metadata storage mec[3D[K
mechanism.

