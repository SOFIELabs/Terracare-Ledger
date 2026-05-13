import os
from datetime import datetime
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.live import Live
from rich.layout import Layout
from rich.text import Text

console = Console()

class JarvisTUI:
    def __init__(self):
        self.log_entries = []
        self.max_logs = 10
        self.navy_blue = "on blue"
        self.gold = "bold yellow"

    def add_log(self, message):
        """Jarvis Clone: Background Consciousness Stream"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        entry = f"[{timestamp}] {message}"
        self.log_entries.append(entry)
        if len(self.log_entries) > self.max_logs:
            self.log_entries.pop(0)

    def render_dashboard(self, system_status, swarm_status):
        """Unbounded UI: Gold-Etched Navy Blue Matrix Render"""
        layout = Layout()
        layout.split_column(
            Layout(name="header", size=3),
            Layout(name="main", ratio=1)
        )
        layout["main"].split_row(
            Layout(name="sensors", ratio=1),
            Layout(name="stream", ratio=1)
        )

        # 1. Header: Sovereign Identity
        layout["header"].update(Panel(
            Text("S.O.F.I.E. OS - Sovereign Citizen v6.0", justify="center", style=self.gold),
            border_style="yellow", style=self.navy_blue
        ))

        # 2. Sensor Table: Real-Time Reality Audit
        sensor_table = Table(title="Swarm Telemetry", border_style="blue", expand=True)
        sensor_table.add_column("Component", style="cyan")
        sensor_table.add_column("Status", justify="right")

        for key, val in system_status.items():
            status = "[green]ONLINE[/]" if val == "ONLINE" else "[red]OFFLINE[/]"
            sensor_table.add_row(key.upper(), status)
        
        sensor_table.add_section()
        sensor_table.add_row("RAM SHIELD", swarm_status.get("RAM_Usage", "N/A"))
        sensor_table.add_row("SWARM STATE", swarm_status.get("State", "N/A"))

        layout["sensors"].update(Panel(sensor_table, border_style="blue", style=self.navy_blue))

        # 3. Conscious Stream: The Brief of Fixes
        log_text = Text("\n".join(self.log_entries), style="white")
        layout["stream"].update(Panel(
            log_text, title="Conscious Stream (Brief of Fixes)", 
            border_style="yellow", style=self.navy_blue
        ))

        # Clear and Print (Manual refresh handled by SOFIE_Core)
        console.clear()
        console.print(layout)