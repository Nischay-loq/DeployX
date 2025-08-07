import shutil

# List of possible shells to check
possible_shells = [
    "cmd.exe",
    "powershell.exe",
    "pwsh.exe",
    "bash.exe",
    "wsl.exe",
    "wt.exe"
]

available_shells = []

print("Checking for available shells...\n")

for shell in possible_shells:
    path = shutil.which(shell)
    if path:
        available_shells.append(shell)

print(available_shells)
