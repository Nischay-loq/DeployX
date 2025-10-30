"""Detector for destructive commands that may require backups."""
import re
import logging
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
import platform

logger = logging.getLogger(__name__)


class DestructiveCommandDetector:
    """Detects destructive commands and extracts affected paths."""
    
    # Destructive command patterns for different shells
    DESTRUCTIVE_PATTERNS = {
        # File/Directory deletion commands
        'delete': [
            # Windows
            r'\b(del|erase)\s+(?:\/[a-z]+\s+)*["\']?([^"\'>\s]+)["\']?',  # del, erase
            r'\brd\s+(?:\/[a-z]+\s+)*["\']?([^"\'>\s]+)["\']?',  # rd (remove directory)
            r'\brmdir\s+(?:\/[a-z]+\s+)*["\']?([^"\'>\s]+)["\']?',  # rmdir
            # Unix/Linux
            r'\brm\s+(?:-[a-z]+\s+)*["\']?([^"\'>\s]+)["\']?',  # rm
            # PowerShell
            r'\bRemove-Item\s+(?:-[a-zA-Z]+\s+)*["\']?([^"\'>\s]+)["\']?',  # Remove-Item
            r'\bri\s+(?:-[a-zA-Z]+\s+)*["\']?([^"\'>\s]+)["\']?',  # ri (Remove-Item alias)
        ],
        # File/Directory move/rename (can be destructive if overwriting)
        'move': [
            # Windows
            r'\bmove\s+(?:\/[a-z]+\s+)*["\']?([^"\'>\s]+)["\']?\s+["\']?([^"\'>\s]+)["\']?',
            r'\bren\s+(?:\/[a-z]+\s+)*["\']?([^"\'>\s]+)["\']?',  # rename
            r'\brename\s+(?:\/[a-z]+\s+)*["\']?([^"\'>\s]+)["\']?',
            # Unix/Linux
            r'\bmv\s+(?:-[a-z]+\s+)*["\']?([^"\'>\s]+)["\']?\s+["\']?([^"\'>\s]+)["\']?',
            # PowerShell
            r'\bMove-Item\s+(?:-[a-zA-Z]+\s+)*["\']?([^"\'>\s]+)["\']?',
            r'\bmi\s+(?:-[a-zA-Z]+\s+)*["\']?([^"\'>\s]+)["\']?',  # mi (Move-Item alias)
            r'\bRename-Item\s+(?:-[a-zA-Z]+\s+)*["\']?([^"\'>\s]+)["\']?',
            r'\brni\s+(?:-[a-zA-Z]+\s+)*["\']?([^"\'>\s]+)["\']?',  # rni (Rename-Item alias)
        ],
        # Format/partition operations
        'format': [
            r'\bformat\s+([a-zA-Z]:)',  # format drive
            r'\bdiskpart\b',  # diskpart (can be very destructive)
            r'\bmkfs\.',  # Unix filesystem creation
            r'\bfdisk\b',  # Unix disk partitioning
        ],
        # Truncate/clear files
        'truncate': [
            # Redirect to empty
            r'\becho\s+(?:""|\'\'|\.)\s*>\s*["\']?([^"\'>\s]+)["\']?',
            # PowerShell clear
            r'\bClear-Content\s+(?:-[a-zA-Z]+\s+)*["\']?([^"\'>\s]+)["\']?',
            r'\bclc\s+(?:-[a-zA-Z]+\s+)*["\']?([^"\'>\s]+)["\']?',  # clc (Clear-Content alias)
            # Unix truncate
            r'\btruncate\s+(?:-[a-z]+\s+)*["\']?([^"\'>\s]+)["\']?',
            # Output redirection that overwrites
            r'>\s*["\']?([^"\'>\s]+)["\']?(?!\s*>)',  # Single > (overwrite)
        ],
        # Registry operations (Windows)
        'registry': [
            r'\breg\s+delete\b',
            r'\breg\s+add\b.*\/f',  # Force add (overwrites)
        ],
        # Database operations
        'database': [
            r'\bDROP\s+(TABLE|DATABASE|SCHEMA)\b',
            r'\bTRUNCATE\s+TABLE\b',
            r'\bDELETE\s+FROM\b',
        ],
        # System-wide operations
        'system': [
            r'\bshutdown\b',
            r'\breboot\b',
            r'\binit\s+[0-6]',
            r'\bsystemctl\s+(stop|disable|mask)',
            r'\bsc\s+(stop|delete)\b',  # Windows service control
        ]
    }
    
    # Patterns that indicate safe operations (exclusions)
    SAFE_PATTERNS = [
        r'\bdir\s+',
        r'\bls\s+',
        r'\bGet-ChildItem\s+',
        r'\becho\s+.*>>\s+',  # Append (not overwrite)
        r'\bcopy\s+',
        r'\bcp\s+',
        r'\bxcopy\s+',
        r'\brobocopy\s+',
        r'\brsync\s+',
    ]
    
    def __init__(self):
        """Initialize destructive command detector."""
        self.os_type = platform.system().lower()
        logger.info(f"DestructiveCommandDetector initialized for OS: {self.os_type}")
    
    def is_destructive(self, command: str) -> bool:
        """Check if a command is potentially destructive.
        
        Args:
            command: Command to check
        
        Returns:
            True if command is destructive, False otherwise
        """
        command_lower = command.lower().strip()
        
        # Check safe patterns first
        for pattern in self.SAFE_PATTERNS:
            if re.search(pattern, command_lower, re.IGNORECASE):
                return False
        
        # Check destructive patterns
        for category, patterns in self.DESTRUCTIVE_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, command_lower, re.IGNORECASE):
                    logger.info(f"Detected destructive command in category '{category}': {command}")
                    return True
        
        return False
    
    def analyze_command(self, command: str) -> Dict[str, Any]:
        """Analyze a command to determine if it's destructive and extract details.
        
        Args:
            command: Command to analyze
        
        Returns:
            Dictionary with analysis results:
                - is_destructive: bool
                - category: str (type of destructive operation)
                - affected_paths: list of paths that will be affected
                - severity: str (low, medium, high, critical)
                - description: str (description of what the command does)
                - requires_backup: bool
        """
        result = {
            'is_destructive': False,
            'category': None,
            'affected_paths': [],
            'severity': 'low',
            'description': '',
            'requires_backup': False
        }
        
        command_lower = command.lower().strip()
        
        # Check safe patterns
        for pattern in self.SAFE_PATTERNS:
            if re.search(pattern, command_lower, re.IGNORECASE):
                return result
        
        # Check destructive patterns
        for category, patterns in self.DESTRUCTIVE_PATTERNS.items():
            for pattern in patterns:
                match = re.search(pattern, command, re.IGNORECASE)
                if match:
                    result['is_destructive'] = True
                    result['category'] = category
                    
                    # Extract affected paths from regex groups
                    paths = []
                    for group in match.groups():
                        if group and group.strip():
                            # Clean up path
                            path = group.strip().strip('"').strip("'")
                            if path and not path.startswith('-'):  # Skip flags
                                paths.append(path)
                    
                    result['affected_paths'] = paths
                    
                    # Determine severity and backup requirement
                    severity_info = self._determine_severity(category, command_lower, paths)
                    result['severity'] = severity_info['severity']
                    result['description'] = severity_info['description']
                    result['requires_backup'] = severity_info['requires_backup']
                    
                    logger.info(f"Command analysis - Category: {category}, Severity: {result['severity']}, "
                               f"Paths: {paths}, Backup required: {result['requires_backup']}")
                    
                    return result
        
        return result
    
    def _determine_severity(
        self,
        category: str,
        command: str,
        paths: List[str]
    ) -> Dict[str, Any]:
        """Determine the severity of a destructive command.
        
        Args:
            category: Category of destructive operation
            command: The command string
            paths: Affected paths
        
        Returns:
            Dictionary with severity, description, and backup requirement
        """
        severity = 'medium'
        description = ''
        requires_backup = True
        
        if category == 'delete':
            description = 'Deletes files or directories'
            
            # Check for recursive deletion
            if any(flag in command for flag in ['/s', '-r', '-rf', '-recurse', '-force']):
                severity = 'high'
                description = 'Recursively deletes files or directories'
            
            # Check for wildcard deletion
            if any(wildcard in command for wildcard in ['*', '?']):
                severity = 'high'
                description = 'Deletes multiple files using wildcards'
            
            # Check for system paths
            if self._affects_system_paths(paths):
                severity = 'critical'
                description = 'Deletes system files or directories (CRITICAL)'
        
        elif category == 'move':
            description = 'Moves or renames files/directories'
            severity = 'medium'
            
            # Force move can overwrite
            if any(flag in command for flag in ['/y', '-f', '-force']):
                severity = 'high'
                description = 'Forcefully moves/renames (may overwrite existing files)'
        
        elif category == 'format':
            description = 'Formats disk or partition (ALL DATA WILL BE LOST)'
            severity = 'critical'
            requires_backup = False  # Can't backup entire partition easily
        
        elif category == 'truncate':
            description = 'Overwrites or clears file contents'
            severity = 'medium'
        
        elif category == 'registry':
            description = 'Modifies Windows registry'
            severity = 'high'
        
        elif category == 'database':
            description = 'Destructive database operation'
            severity = 'high'
        
        elif category == 'system':
            description = 'System-wide operation'
            severity = 'critical'
            requires_backup = False  # Can't backup system state easily
        
        return {
            'severity': severity,
            'description': description,
            'requires_backup': requires_backup
        }
    
    def _affects_system_paths(self, paths: List[str]) -> bool:
        """Check if any paths are system paths.
        
        Args:
            paths: List of paths to check
        
        Returns:
            True if any path is a system path
        """
        if not paths:
            return False
        
        system_paths_windows = [
            'c:\\windows', 'c:\\program files', 'c:\\program files (x86)',
            'c:\\system', 'c:\\boot', 'c:\\users\\all users',
            'c:\\programdata'
        ]
        
        system_paths_unix = [
            '/bin', '/sbin', '/usr/bin', '/usr/sbin', '/lib',
            '/etc', '/boot', '/sys', '/proc', '/root'
        ]
        
        system_paths = system_paths_windows if self.os_type == 'windows' else system_paths_unix
        
        for path in paths:
            path_lower = path.lower()
            for sys_path in system_paths:
                if path_lower.startswith(sys_path):
                    return True
        
        return False
    
    def extract_paths(self, command: str) -> List[str]:
        """Extract file/directory paths from a command.
        
        Args:
            command: Command to extract paths from
        
        Returns:
            List of extracted paths
        """
        analysis = self.analyze_command(command)
        return analysis.get('affected_paths', [])
    
    def get_backup_paths(self, command: str) -> List[str]:
        """Get list of paths that should be backed up before executing command.
        
        Args:
            command: Command to analyze
        
        Returns:
            List of paths to backup (only existing paths)
        """
        analysis = self.analyze_command(command)
        
        if not analysis['requires_backup']:
            return []
        
        paths_to_backup = []
        for path in analysis.get('affected_paths', []):
            try:
                # Expand path if needed
                expanded_path = Path(path).expanduser()
                
                # Only backup if path exists
                if expanded_path.exists():
                    paths_to_backup.append(str(expanded_path))
                else:
                    logger.debug(f"Path does not exist, skipping backup: {path}")
            except Exception as e:
                logger.warning(f"Failed to process path {path}: {e}")
        
        return paths_to_backup
