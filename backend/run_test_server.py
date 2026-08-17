import subprocess
import time
import urllib.request
import urllib.error

# Start the uvicorn server on port 8001
process = subprocess.Popen(["venv/bin/uvicorn", "main:app", "--port", "8001"], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
time.sleep(3) # Wait for server to start

try:
    req = urllib.request.Request("http://localhost:8001/api/v1/places?page=1&per_page=12&sort_by=name&sort_order=asc")
    with urllib.request.urlopen(req) as response:
        print(f"Status Code: {response.status}")
        print(f"Response: {response.read().decode('utf-8')}")
except urllib.error.HTTPError as e:
    print(f"Request failed with status {e.code}: {e.read().decode('utf-8')}")
except Exception as e:
    print(f"Request completely failed: {e}")

# Kill the server
process.terminate()

# Print logs
stdout, _ = process.communicate()
print("\n--- SERVER LOGS ---")
print(stdout.decode('utf-8'))
