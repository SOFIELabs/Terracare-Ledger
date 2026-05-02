import os
import customtkinter as ctk
import psutil
import datetime

# --- PIXEL-PERFECT AESTHETIC ---
COLOR_BG = "#010409"
COLOR_PANEL = "#0D1117"
COLOR_GOLD = "#D4AF37"
COLOR_CYAN = "#58A6FF"
COLOR_BORDER = "#1F2937"

class SofieSovereignOS(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("S.O.F.I.E. Sovereign OS")
        self.attributes('-fullscreen', True)
        self.configure(fg_color=COLOR_BG)
        self.bind("<Escape>", lambda e: self.destroy())

        self.setup_ui()
        self.update_loop()

    def setup_ui(self):
        # 1. TOP CENTER HEADER
        self.header = ctk.CTkLabel(self, text="S.O.F.I.E. PRIVATE CORE", 
                                  font=("Orbitron", 28, "bold"), text_color=COLOR_GOLD)
        self.header.place(relx=0.5, rely=0.05, anchor="center")
        
        self.timestamp = ctk.CTkLabel(self, text="", font=("Consolas", 14), text_color="#8B949E")
        self.timestamp.place(relx=0.5, rely=0.08, anchor="center")

        # 2. LEFT DIAGNOSTICS PANEL (image_cdca40 alignment)
        self.left_panel = ctk.CTkFrame(self, width=350, height=650, fg_color=COLOR_PANEL, 
                                      corner_radius=15, border_width=1, border_color=COLOR_BORDER)
        self.left_panel.place(relx=0.02, rely=0.12)
        
        ctk.CTkLabel(self.left_panel, text="SYSTEM DIAGNOSTICS", font=("Orbitron", 14), text_color=COLOR_GOLD).place(x=70, y=20)
        
        ctk.CTkLabel(self.left_panel, text="CPU LOAD", font=("Consolas", 10), text_color="#8B949E").place(x=20, y=60)
        self.cpu_bar = ctk.CTkProgressBar(self.left_panel, width=200, progress_color=COLOR_CYAN, fg_color="#161B22")
        self.cpu_bar.place(x=80, y=65)
        
        ctk.CTkLabel(self.left_panel, text="MEMORY USAGE", font=("Consolas", 10), text_color="#8B949E").place(x=20, y=100)
        self.ram_bar = ctk.CTkProgressBar(self.left_panel, width=200, progress_color=COLOR_CYAN, fg_color="#161B22")
        self.ram_bar.place(x=80, y=105)

        # 3. CENTER PULSE (image_cdca40 alignment)
        self.pulse = ctk.CTkLabel(self, text="◎", font=("Segoe UI Symbol", 120), text_color=COLOR_CYAN)
        self.pulse.place(relx=0.5, rely=0.45, anchor="center")
        
        self.active_text = ctk.CTkLabel(self, text="S.O.F.I.E. ACTIVE", font=("Orbitron", 36, "bold"), text_color="white")
        self.active_text.place(relx=0.5, rely=0.85, anchor="center")
        
        self.sub_text = ctk.CTkLabel(self, text="SOVEREIGN OS LAYER ENFORCED", font=("Consolas", 11), text_color=COLOR_CYAN)
        self.sub_text.place(relx=0.5, rely=0.89, anchor="center")

        # 4. RIGHT CONVERSATION PANEL (image_cdca40 alignment)
        self.right_panel = ctk.CTkFrame(self, width=450, height=650, fg_color=COLOR_PANEL, 
                                       corner_radius=15, border_width=1, border_color=COLOR_BORDER)
        self.right_panel.place(relx=0.74, rely=0.12)
        
        self.console = ctk.CTkTextbox(self.right_panel, width=420, height=600, fg_color="transparent", 
                                     text_color="white", font=("Consolas", 13), border_width=0)
        self.console.place(x=15, y=15)
        self.console.insert("end", "[SYSTEM]: Connection established.\n[S.O.F.I.E.]: Welcome back, Peace Architect.")

        # 5. BOTTOM PILL INPUT BOX
        self.input_field = ctk.CTkEntry(self, width=600, height=45, placeholder_text="Awaiting Directive...", 
                                       fg_color=COLOR_PANEL, border_color=COLOR_GOLD, corner_radius=22)
        self.input_field.place(relx=0.5, rely=0.95, anchor="center")

    def update_loop(self):
        # Update Time
        now = datetime.datetime.now()
        self.timestamp.configure(text=now.strftime("%H:%M:%S | %B %d, %Y"))
        
        # Update Hardware Bars
        self.cpu_bar.set(psutil.cpu_percent() / 100)
        self.ram_bar.set(psutil.virtual_memory().percent / 100)
        
        self.after(1000, self.update_loop)

if __name__ == "__main__":
    # pip install customtkinter psutil
    app = SofieSovereignOS()
    app.mainloop()