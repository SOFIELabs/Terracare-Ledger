```java
package com.terracare.swarm;

import java.util.HashMap;
import java.util.Map;

public class MeshMetadataBridge {
    private Map<String, Object> meshMeta = new HashMap<>();

    public void setMeshMeta(String key, Object value) {
        meshMeta.put(key, value);
    }

    public Map<String, Object> getMeshMeta() {
        return meshMeta;
    }
}
```

