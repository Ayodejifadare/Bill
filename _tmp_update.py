from pathlib import Path
import textwrap
path = Path('App.tsx')
text = path.read_text().replace('\r\n', '\n')
