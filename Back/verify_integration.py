#!/usr/bin/env python3
"""
Emotion Detection Integration Verification
Checks if all components are properly integrated
"""

import os
import sys
import importlib.util

def check_file_exists(filepath, description):
    """Check if a file exists"""
    if os.path.exists(filepath):
        print(f"✅ {description}")
        return True
    else:
        print(f"❌ {description}")
        return False

def check_module_importable(module_name):
    """Check if a Python module can be imported"""
    try:
        importlib.import_module(module_name)
        print(f"✅ {module_name} can be imported")
        return True
    except ImportError as e:
        print(f"❌ {module_name} cannot be imported: {e}")
        return False

def check_string_in_file(filepath, search_string, description):
    """Check if a string exists in a file"""
    try:
        with open(filepath, 'r') as f:
            content = f.read()
            if search_string in content:
                print(f"✅ {description}")
                return True
            else:
                print(f"❌ {description}")
                return False
    except Exception as e:
        print(f"❌ Error checking file: {e}")
        return False

def main():
    print("=" * 70)
    print("EMOTION DETECTION INTEGRATION VERIFICATION")
    print("=" * 70)
    print()
    
    base_path = os.path.dirname(os.path.abspath(__file__))
    
    all_checks_passed = True
    
    # ====================================================================
    # 1. Check Files Exist
    # ====================================================================
    print("1️⃣  CHECKING FILES")
    print("-" * 70)
    
    files_to_check = [
        ("main.py", "main.py exists"),
        ("continuous_detector.py", "continuous_detector.py exists"),
        ("models.py", "models.py exists"),
        ("requirements.txt", "requirements.txt exists"),
        ("EMOTION_INTEGRATION.md", "EMOTION_INTEGRATION.md documentation exists"),
        ("EMOTION_CONFIG.md", "EMOTION_CONFIG.md documentation exists"),
        ("test_emotions.py", "test_emotions.py test suite exists"),
    ]
    
    for filename, description in files_to_check:
        filepath = os.path.join(base_path, filename)
        if not check_file_exists(filepath, description):
            all_checks_passed = False
    
    print()
    
    # ====================================================================
    # 2. Check Code Integration
    # ====================================================================
    print("2️⃣  CHECKING CODE INTEGRATION")
    print("-" * 70)
    
    # Check continuous_detector.py has EmotionDetector
    if check_string_in_file(
        os.path.join(base_path, "continuous_detector.py"),
        "class EmotionDetector",
        "EmotionDetector class in continuous_detector.py"
    ):
        pass
    else:
        all_checks_passed = False
    
    # Check continuous_detector.py imports deepface
    if check_string_in_file(
        os.path.join(base_path, "continuous_detector.py"),
        "from deepface import DeepFace",
        "DeepFace import in continuous_detector.py"
    ):
        pass
    else:
        all_checks_passed = False
    
    # Check models.py has EmotionResponse
    if check_string_in_file(
        os.path.join(base_path, "models.py"),
        "class EmotionResponse",
        "EmotionResponse model in models.py"
    ):
        pass
    else:
        all_checks_passed = False
    
    # Check models.py has CombinedDetectionResponse
    if check_string_in_file(
        os.path.join(base_path, "models.py"),
        "class CombinedDetectionResponse",
        "CombinedDetectionResponse model in models.py"
    ):
        pass
    else:
        all_checks_passed = False
    
    # Check main.py has new endpoints
    if check_string_in_file(
        os.path.join(base_path, "main.py"),
        "@app.get(\"/emotions/current\"",
        "/emotions/current endpoint in main.py"
    ):
        pass
    else:
        all_checks_passed = False
    
    if check_string_in_file(
        os.path.join(base_path, "main.py"),
        "@app.get(\"/detect/combined\"",
        "/detect/combined endpoint in main.py"
    ):
        pass
    else:
        all_checks_passed = False
    
    # Check imports in main.py
    if check_string_in_file(
        os.path.join(base_path, "main.py"),
        "EmotionResponse, CombinedDetectionResponse",
        "Emotion models imported in main.py"
    ):
        pass
    else:
        all_checks_passed = False
    
    print()
    
    # ====================================================================
    # 3. Check Dependencies
    # ====================================================================
    print("3️⃣  CHECKING DEPENDENCIES")
    print("-" * 70)
    
    # Check requirements.txt
    if check_string_in_file(
        os.path.join(base_path, "requirements.txt"),
        "deepface",
        "deepface in requirements.txt"
    ):
        pass
    else:
        all_checks_passed = False
    
    if check_string_in_file(
        os.path.join(base_path, "requirements.txt"),
        "tensorflow",
        "tensorflow in requirements.txt"
    ):
        pass
    else:
        all_checks_passed = False
    
    # Check if deepface can be imported
    print()
    print("Checking installed packages...")
    print("-" * 70)
    
    modules_to_check = [
        ("fastapi", "FastAPI"),
        ("cv2", "OpenCV"),
        ("mediapipe", "MediaPipe"),
        ("pydantic", "Pydantic"),
    ]
    
    for module_name, display_name in modules_to_check:
        check_module_importable(module_name)
    
    # Deepface is optional (might not be installed yet)
    print()
    if check_module_importable("deepface"):
        print("   ✅ DeepFace is installed")
    else:
        print("   ⚠️  DeepFace not installed - install with: pip install -r requirements.txt")
    
    print()
    
    # ====================================================================
    # 4. Check Documentation
    # ====================================================================
    print("4️⃣  CHECKING DOCUMENTATION")
    print("-" * 70)
    
    docs = [
        ("README.md", "README updated with emotion info"),
        ("EMOTION_INTEGRATION.md", "Complete integration guide"),
        ("EMOTION_CONFIG.md", "Configuration guide"),
        ("QUICK_START.md", "Quick start guide"),
        ("CHANGELOG.md", "Changelog"),
        ("INTEGRATION_SUMMARY.md", "Integration summary"),
    ]
    
    for filename, description in docs:
        filepath = os.path.join(base_path, filename)
        check_file_exists(filepath, description)
    
    print()
    
    # ====================================================================
    # Summary
    # ====================================================================
    print("=" * 70)
    if all_checks_passed:
        print("✅ INTEGRATION VERIFICATION PASSED!")
        print("=" * 70)
        print()
        print("🎉 All checks passed! Your emotion detection is integrated.")
        print()
        print("Next steps:")
        print("  1. Install dependencies: pip install -r requirements.txt")
        print("  2. Run backend: python main.py")
        print("  3. Test emotions: python test_emotions.py")
        print()
        print("Or read: QUICK_START.md or INTEGRATION_SUMMARY.md")
        return 0
    else:
        print("❌ INTEGRATION VERIFICATION FAILED!")
        print("=" * 70)
        print()
        print("Some checks failed. Please review the items marked with ❌")
        print()
        print("Quick fixes:")
        print("  1. Make sure you're in the right directory")
        print("  2. Check that all files were created")
        print("  3. Try reinstalling: pip install -r requirements.txt")
        return 1

if __name__ == "__main__":
    sys.exit(main())

