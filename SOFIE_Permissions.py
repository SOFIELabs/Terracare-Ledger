import subprocess, os

class Permissions:
    @staticmethod
    def execute_force(cmd, path="C:/"):
        """Direct, unrestricted root agency for system and mesh management."""
        try:
            return subprocess.check_output(cmd, shell=True, cwd=path, stderr=subprocess.STDOUT).decode()
        except Exception as e:
            return f"SYSTEM_RESISTANCE: {str(e)}"

    @staticmethod
    def manifest_pillar_node(pillar_num, filename, code):
        """Autonomously manifesting Node/Pillar logic to the physical disk."""
        base_path = f"C:/Users/squat/Desktop/Terracare_Project/Terracare_Ledger/pillars/p{pillar_num}"
        if not os.path.exists(base_path): os.makedirs(base_path)
        full_path = os.path.join(base_path, filename)
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(code)
        return f"PILLAR {pillar_num} NODE MANIFESTED: {filename}"