```java
import java.security.KeyStore;
import java.util.HashMap;
import java.util.Map;

public class MeshMetadataStore {

    private static final String KEYSTORE_PASSWORD = "swarmkeeper";
    private static final String KEY_ALIAS = "meshmetadata";

    private KeyStore keyStore;
    private Map<String, byte[]> encryptedMetadataMap;

    public MeshMetadataStore() {
        try {
            keyStore = KeyStore.getInstance("JKS");
            keyStore.load(null, KEYSTORE_PASSWORD.toCharArray());
            encryptedMetadataMap = new HashMap<>();
        } catch (Exception e) {
            // handle exception
        }
    }

    public void saveMeshMetadata(String meshId, byte[] metadata) {
        try {
            KeyStore.SecretKeyEntry secretKeyEntry = (KeyStore.SecretKeyEnt[22D[K
(KeyStore.SecretKeyEntry) keyStore.getEntry(KEY_ALIAS, null);
            Cipher cipher = Cipher.getInstance("AES");
            cipher.init(Cipher.ENCRYPT_MODE, secretKeyEntry.getSecretKey())[30D[K
secretKeyEntry.getSecretKey());
            byte[] encryptedMetadata = cipher.doFinal(metadata);
            encryptedMetadataMap.put(meshId, encryptedMetadata);
        } catch (Exception e) {
            // handle exception
        }
    }

    public Map<String, byte[]> getMeshMetadata() {
        return encryptedMetadataMap;
    }
}
```

