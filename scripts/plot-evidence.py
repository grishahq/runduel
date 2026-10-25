"""Plot declared check outcomes only. Requires matplotlib; no latency claims."""
import json
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

root = Path(__file__).resolve().parents[1]
data = json.loads((root/'docs/evidence/fixed-suite.json').read_text())
roles = ['baseline','candidate']
colors = ['#a8ebd0','#e9ae92']
fig, ax = plt.subplots(figsize=(12,7),dpi=160)
fig.patch.set_facecolor('#0b1522'); ax.set_facecolor('#0b1522')
for i,role in enumerate(roles):
    records = [r for r in data['records'] if r['role']==role]
    scores = [sum(c['passed'] for c in r['checks']) for r in records]
    positions = [j+(i-.5)*.32 for j in range(3)]
    bars = ax.bar(positions,scores,.29,color=colors[i],label='Baseline: normalization retained' if i==0 else 'Candidate: normalization removed')
    ax.bar_label(bars,labels=[f'{s}/3' for s in scores],color='#e7eef4',padding=7,fontsize=14)
ax.set_xticks(range(3),['USD invoice','EUR invoice','GBP zero-value invoice'],color='#cad9e4',fontsize=12)
ax.set_ylim(0,3.7);ax.set_yticks([0,1,2,3]);ax.tick_params(axis='y',colors='#9eb1c2');ax.set_ylabel('Exact typed field checks passed',color='#9eb1c2',labelpad=14)
for spine in ax.spines.values():spine.set_visible(False)
ax.grid(axis='y',color='#2b3b4b',linewidth=.6);ax.set_axisbelow(True)
ax.legend(facecolor='#142435',edgecolor='#2b3b4b',labelcolor='#e7eef4',loc='upper center',bbox_to_anchor=(.5,1.09),ncol=1)
fig.text(.07,.94,'One removed tool. Three reproducible failures.',color='#e7eef4',fontsize=23,weight='bold')
fig.text(.07,.045,'RunDuel · Real Agno 2.5.9 execution · Deterministic offline model · 3 synthetic tasks, one pair each\nChecks declared before runs. All 3 failures: missing currency. Controlled regression demonstration; not a model benchmark.',color='#9eb1c2',fontsize=10,linespacing=1.6)
fig.subplots_adjust(left=.09,right=.96,top=.77,bottom=.19)
fig.savefig(root/'campaign/assets/04-fixed-suite-results.png',facecolor=fig.get_facecolor())
