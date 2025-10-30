#!/bin/bash

# Master build script for all platforms
# Run on appropriate platform

echo "========================================="
echo "DeployX Agent Build Script"
echo "========================================="
echo ""

echo "Select platform to build:"
echo "1. Windows (requires Windows)"
echo "2. Linux (current platform)"
echo "3. macOS (requires macOS)"
echo ""

read -p "Select platform (1-3): " choice

case $choice in
    1)
        echo ""
        echo "Building for Windows..."
        echo ""
        echo "Please run this on Windows:"
        echo "  cd build\windows"
        echo "  python build_windows.py"
        echo ""
        ;;
    2)
        echo ""
        echo "Building for Linux..."
        cd build/linux
        chmod +x build_linux.sh
        ./build_linux.sh
        cd ../..
        echo ""
        echo "========================================="
        echo "Linux build complete!"
        echo "Check: build/linux/"
        echo "========================================="
        ;;
    3)
        echo ""
        echo "Building for macOS..."
        echo ""
        if [[ "$OSTYPE" == "darwin"* ]]; then
            cd build/macos
            chmod +x build_macos.sh
            ./build_macos.sh
            cd ../..
            echo ""
            echo "========================================="
            echo "macOS build complete!"
            echo "Check: build/macos/"
            echo "========================================="
        else
            echo "Please run this on macOS:"
            echo "  cd build/macos"
            echo "  chmod +x build_macos.sh"
            echo "  ./build_macos.sh"
            echo ""
        fi
        ;;
    *)
        echo "Invalid choice!"
        ;;
esac
