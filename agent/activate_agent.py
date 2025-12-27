"""
DeployX Agent Activation Helper

This script helps set the activation key for the DeployX agent,
especially useful when running as a Windows background service.

Usage:
    python activate_agent.py --key YOUR-ACTIVATION-KEY
    python activate_agent.py --check
    python activate_agent.py --clear
"""
import argparse
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agent.core.activation import (
    set_pending_activation_key,
    load_activation_data,
    clear_local_activation,
    ACTIVATION_FILE,
    CONFIG_DIR
)


def main():
    parser = argparse.ArgumentParser(
        description="DeployX Agent Activation Helper",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    Activate agent:     python activate_agent.py --key XXXX-XXXX-XXXX-XXXX
    Check status:       python activate_agent.py --check
    Clear activation:   python activate_agent.py --clear
    Show config path:   python activate_agent.py --path
        """
    )
    
    parser.add_argument(
        "--key", "-k",
        help="Set the activation key for the agent"
    )
    parser.add_argument(
        "--check", "-c",
        action="store_true",
        help="Check current activation status"
    )
    parser.add_argument(
        "--clear",
        action="store_true",
        help="Clear local activation data"
    )
    parser.add_argument(
        "--path", "-p",
        action="store_true",
        help="Show the activation config file path"
    )
    
    args = parser.parse_args()
    
    if args.path:
        print(f"Config directory: {CONFIG_DIR}")
        print(f"Activation file: {ACTIVATION_FILE}")
        return
    
    if args.check:
        data = load_activation_data()
        if data and data.get('activated'):
            print("✓ Agent is activated")
            print(f"  Machine ID: {data.get('machine_id', 'N/A')}")
            print(f"  Agent ID: {data.get('agent_id', 'N/A')}")
            print(f"  Expires: {data.get('expires_at', 'N/A')}")
            if data.get('activation_key'):
                print(f"  Key: {data.get('activation_key')}")
        else:
            print("✗ Agent is not activated")
            print("  Use --key YOUR-KEY to set an activation key")
        return
    
    if args.clear:
        clear_local_activation()
        print("✓ Local activation data cleared")
        print("  The agent will need to be re-activated on next start")
        return
    
    if args.key:
        # Validate key format (basic check)
        key = args.key.strip().upper()
        if len(key.replace('-', '')) < 16:
            print("✗ Invalid key format. Expected format: XXXX-XXXX-XXXX-XXXX")
            sys.exit(1)
        
        if set_pending_activation_key(key):
            print("✓ Activation key set successfully")
            print("  The agent will activate on next start")
            print(f"  Config saved to: {CONFIG_DIR / 'pending_activation.txt'}")
        else:
            print("✗ Failed to set activation key")
            sys.exit(1)
        return
    
    # No arguments provided
    parser.print_help()


if __name__ == "__main__":
    main()
