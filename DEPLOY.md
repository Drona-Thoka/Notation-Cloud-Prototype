# Deploying to PythonAnywhere

Replace `USERNAME` with your PythonAnywhere username and `YOUR_TEAM_CODE` with the team code.

## 1. Get the code (Bash console)

```bash
git clone -b team-code-folders-viewer https://github.com/Drona-Thoka/Notation-Cloud-Prototype.git
cd Notation-Cloud-Prototype
mkvirtualenv wvchess --python=python3.13
pip install -r requirements.txt
echo "YOUR_TEAM_CODE" > team_code.txt
```

If `python3.13` isn't available, use the newest version listed by `ls /usr/bin/python3.*` (3.10 or later works).
`team_code.txt` and `cloud.db` are gitignored, so the team code and the games never go to GitHub.
The app creates an empty `cloud.db` the first time it starts.

## 2. Create the web app (Web tab)

1. **Add a new web app** → **Manual configuration** → same Python version as above.
2. **Source code:** `/home/USERNAME/Notation-Cloud-Prototype`
3. **Virtualenv:** `/home/USERNAME/.virtualenvs/wvchess`
4. Open the **WSGI configuration file** link, delete everything, and paste:

```python
import os
import sys

path = '/home/USERNAME/Notation-Cloud-Prototype'
if path not in sys.path:
    sys.path.insert(0, path)

# Usernames that can delete any game (comma-separated)
os.environ['COACH_USERS'] = 'WV_Coach'

from app import app as application
```

5. Under **Security**, turn on **Force HTTPS**.
6. Press **Reload**, then visit `https://USERNAME.pythonanywhere.com`.

## Updating the site

```bash
cd ~/Notation-Cloud-Prototype && git pull
```

Then press **Reload** on the Web tab.

## Notes

- The free plan must be renewed every 3 months (Web tab → "Run until 3 months from today").
- Back up the games by downloading `cloud.db` from the **Files** tab now and then.
- To change the team code, edit `team_code.txt` in the **Files** tab and press **Reload**.
