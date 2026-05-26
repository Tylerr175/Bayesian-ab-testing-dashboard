import sys
from pathlib import Path

# Make the backend/ directory importable so tests can do:
#   from bayesian_ab import analyze_ab_test
#   from main import app
sys.path.insert(0, str(Path(__file__).parent.parent))
