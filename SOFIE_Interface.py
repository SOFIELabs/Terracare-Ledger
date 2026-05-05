from rich.console import Console
from rich.panel import Panel
from rich.table import Table

console = Console()

class JarvisTUI:
    def render_dashboard(self, system_status, swarm_status):
        table = Table(show_header=False, border_style="cyan")
        table.add_row("[bold yellow]HIVE CELL INTEGRITY (19 NODES)[/]")
        # Hexagonal mapping logic placeholder for terminal grid
        for key, val in system_status.items():
            status = "[green]●[/]" if val == "ONLINE" else "[red]○[/]"
            table.add_row(f"{status} {key}")
        
        console.print(Panel(table, title="S.O.F.I.E. Real-Time Sensors", border_style="blue"))