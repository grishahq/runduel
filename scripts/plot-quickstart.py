"""Typeset verified release instructions; this is an instruction card, not UI."""
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
root=Path(__file__).resolve().parents[1]
fig=plt.figure(figsize=(12,8),dpi=160,facecolor='#0b1522')
fig.text(.07,.90,'RunDuel  /  v0.1.0',fontsize=32,color='#e7eef4',weight='bold')
fig.text(.07,.83,'EXPERIMENTAL GITHUB RELEASE',fontsize=11,color='#a8ebd0')
fig.text(.07,.74,'Compare two agent configurations on the same task.',fontsize=17,color='#cad9e4')
commands=['git clone --branch v0.1.0 '+chr(92), '  https://github.com/grishahq/runduel.git', 'cd runduel', 'pnpm install --frozen-lockfile', 'pnpm dev']
# The two displayed clone lines are one command, labeled as wrapped for readability.
for i,line in enumerate(commands):fig.text(.08,.62-i*.065,line,fontsize=17,color='#a8ebd0',family='monospace')
fig.text(.07,.23,'Open localhost:3000 → Compare runs',fontsize=21,color='#e7eef4')
fig.text(.07,.16,'Recorded demo needs no API key. Live example: Python 3.12 / Agno 2.5.9.',fontsize=12,color='#9eb1c2')
fig.text(.07,.08,'Built on Agno Agent UI · MIT license and upstream history retained\ngithub.com/grishahq/runduel/releases/tag/v0.1.0 · Clone command wraps across two lines.',fontsize=10,color='#9eb1c2',linespacing=1.6)
fig.savefig(root/'campaign/assets/05-release-quickstart.png',facecolor=fig.get_facecolor())
