title: "Artist Journey — the story of what happens",
text: `<p>You have work to add to the catalogue. Maybe a whole body of work ready to go at once, maybe just one piece you want to place carefully. You choose how to enter — a batch of images with a spreadsheet, or a single piece on its own. Either way, nothing leaves your machine.</p>
       <p>The machine wakes up. It reads each image without judgment — measuring complexity, mapping colour, appending a clean line to your spreadsheet. Fast, automatic, no network call.
Then the AI becomes available — if you want it. Not before. You decide, field by field, what you'd like it to suggest. A title. Descriptive tags. A price indication based on comparable work. You look at what it offers. Take what's useful, edit what isn't, ignore it entirely if you prefer. The AI is another presence, not an authority.</p>
       <p>Then comes the part only you can do.</p>
       <p>You enter the material truth of the piece. What it's made of. Where those materials came from. Where the work currently is. What the gallery takes. This is not data entry. This is the record of choices you made before anyone else saw the work. The machine waited for this. The AI could not infer it. It exists in the system because you put it there.
The machine compiles everything into a single structured file: Local - Static - Yours.</p>
       <p>Now the AI reads your piece against the Planetary Threshold — not to judge it, but to map where it sits. Shipping distance against material source. Commercial weight against ecological cost. The tensions are made visible, not resolved. This profile doesn't belong to you alone — it becomes part of what a seeker sees when they find your work.</p>
       <p>You add the link to your own site. That's where everything else happens — purchases, prints, conversations, patronage. The platform points. You receive. Your work enters the catalogue. A seeker can now find it.</p>`,
code: `flowchart TD
  %%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#EEEDFE', 'primaryBorderColor': '#534AB7', 'primaryTextColor': '#26215C', 'lineColor': '#888780', 'secondaryColor': '#E1F5EE', 'fontSize': '13px'}}}%%
  classDef trigger fill:#EF9F27,stroke:#b87000,color:#fff
  classDef machine fill:#1D9E75,stroke:#0F6E56,color:#E1F5EE
  classDef decision fill:#7F77DD,stroke:#534AB7,color:#EEEDFE
  classDef ai fill:#F4C0D1,stroke:#c47090,color:#4B1528
  classDef artist fill:#FF7F50,stroke:#cc5500,color:#fff
  classDef terminal fill:#888780,stroke:#5F5E5A,color:#F1EFE8

  START(["artwork enters the system"])
  START --> ENTRY{"batch or\nsingle?"}
  ENTRY -->|"batch"| BATCH["folder + CSV\nyou prepare"]
  ENTRY -->|"single"| SINGLE["one piece\nyou upload"]
  BATCH & SINGLE --> TRIGGER["files land in system\ningestion script wakes"]
  TRIGGER --> MACHINE1["machine reads each image\ncomplexity · colour · auto-appended\nno network · no cloud"]
  MACHINE1 --> OPTAI{"opt in to\nAI per field?"}
  OPTAI -->|"yes"| AISUGGEST["AI suggests\ntitle · tags · price"]
  AISUGGEST --> REVIEW["you review\naccept · edit · reject"]
  OPTAI -->|"no"| YOUFILL["you fill\nall fields"]
  REVIEW & YOUFILL --> MATERIAL["you enter material truth\nmedium · sourcing · current location · gallery split\nonly you can do this"]
  MATERIAL --> COMPILE["machine compiles to JSON\nlocal · static · yours"]
  COMPILE --> THRESHOLD["AI generates planetary threshold profile\nmultivariate · trade-offs visible · not a verdict\nboundary object — different readers same data"]
  THRESHOLD --> LINK["you add link to your own site\npurchases · prints · contact — all happen there"]
  LINK --> CATALOGUE["work enters discovery catalogue\nfiltered · contextualised · threshold visible"]
  CATALOGUE --> END(["a buyer can now find it"])

  class START,END terminal
  class TRIGGER trigger
  class MACHINE1,COMPILE,CATALOGUE machine
  class ENTRY,OPTAI decision
  class AISUGGEST,THRESHOLD ai
  class BATCH,SINGLE,REVIEW,YOUFILL,MATERIAL,LINK artist`


