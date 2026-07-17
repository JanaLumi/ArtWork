title: "System Overview — the architecture",
text: `<p>The system has two journeys running in parallel, and they meet at one point. On one side, an artist entering their work. On the other, a buyer looking for something to live with. The data layer is where they find each other.</p>
       <p>The artist's journey is local first. Nothing leaves their machine until they choose to put it in the catalogue. The machine ingests — reads images for complexity and colour, appends measurements automatically.</p>
       <p>The AI becomes available if the artist wants it — suggesting titles, tags, price indications, field by field, only where invited. Then the artist enters what only they can: the material truth of the piece, where it currently is, what the gallery takes. The machine compiles everything into a structured file. The AI generates a Planetary Threshold profile — not a score, a position across multiple variables. The artist adds a link to their own site. The work enters the catalogue.</p>
       <p>The buyer's journey starts with context. What kind of space. What light. What level of visual complexity. The machine filters the catalogue against these parameters. Works appear. The buyer can move quickly or slow down. If they want to factor in financial value — how the artist's work has moved, what the institutional footprint looks like — that filter is available. But it's coupled to the Planetary Threshold. Raise the speculation dial and the ecological commitment rises with it. The two cannot be separated. Alongside the financial readout, the buyer sees the Planetary Threshold position of each work — including the shipping footprint from the work's origin to where they are. Not a verdict. A set of tensions made visible. The buyer decides what they're willing to carry.</p>
       <p>When they find the right work, the platform points them to the artist's site. That's where the transaction happens, on the artist's own terms. The platform found the match. Everything else is between two people.</p>
       <p>The three actors moving through this system are always distinct. The machine runs automatically — deterministic, no variance, just rules executing. The AI reads and suggests — probabilistic, context-shaped, waiting to be invited. The artist and the buyer both bring what neither machine nor AI can: embodied judgment, situated knowledge, the kind of decision that depends on what you had for lunch and whether it's raining.</p>`,
code: `flowchart TD
  %%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#EEEDFE', 'primaryBorderColor': '#534AB7', 'primaryTextColor': '#26215C', 'lineColor': '#888780', 'secondaryColor': '#E1F5EE', 'fontSize': '13px'}}}%%
  classDef trigger fill:#EF9F27,stroke:#b87000,color:#fff
  classDef machine fill:#1D9E75,stroke:#0F6E56,color:#E1F5EE
  classDef decision fill:#7F77DD,stroke:#534AB7,color:#EEEDFE
  classDef ai fill:#F4C0D1,stroke:#c47090,color:#4B1528
  classDef artist fill:#FF7F50,stroke:#cc5500,color:#fff
  classDef buyer fill:#AAC1BF,stroke:#6a9490,color:#1a3330
  classDef terminal fill:#888780,stroke:#5F5E5A,color:#F1EFE8
  classDef datalayer fill:#F1EFE8,stroke:#888780,color:#2c2c2a

  subgraph ARTIST ["👩🏽‍🎨 Artist Journey"]
    A1(["artwork enters the system"])
    A1 --> A2{"batch or single?"}
    A2 -->|"batch"| A3["folder + CSV"]
    A2 -->|"single"| A4["one piece"]
    A3 & A4 --> A5["machine ingests\ncomplexity · colour · no network"]
    A5 --> A6{"opt in to\nAI per field?"}
    A6 -->|"yes"| A7["AI suggests\ntitle · tags · price"]
    A7 --> A8["artist reviews\naccept · edit · reject"]
    A6 -->|"no"| A9["artist fills\nall fields"]
    A8 & A9 --> A10["artist enters material truth\nmedium · sourcing · location · gallery split"]
    A10 --> A11["machine compiles to JSON\nlocal · static · yours"]
    A11 --> A12["AI generates\nplanetary threshold profile"]
    A12 --> A13["artist adds link\nto own site"]
  end

  subgraph DATALAYER ["⚙️ Shared Data Layer"]
    D1[("structured JSON\nplanetary threshold profile\nartist site link")]
  end

  subgraph BUYER ["🛒 Buyer Journey"]
    B1(["buyer enters discovery interface"])
    B1 --> B2["buyer sets space context\nlight · colours · wall size"]
    B2 --> B3["machine filters catalogue\nagainst space parameters"]
    B3 --> B4{"browse or\ngo deeper?"}
    B4 -->|"browse"| B5["works appear\nmove through the grid"]
    B4 -->|"pause"| B6["lighting simulation\nmaterial record · artist info"]
    B5 & B6 --> B7{"factor in\nfinancial value?"}
    B7 -->|"no"| B8["AI shows planetary threshold\nshipping · materials · studio practices"]
    B7 -->|"yes"| B9["raise speculation filter\nplanetary threshold rises with it"]
    B9 --> B8
    B8 --> B10["buyer sees trade-offs\nnot a verdict · a position"]
    B10 --> B11{"right work\nfound?"}
    B11 -->|"no"| B4
    B11 -->|"yes"| B12["platform points to artist's site\ntransaction on artist's terms"]
    B12 --> B13(["buyer and artist connect directly"])
  end

  A13 --> D1
  D1 --> B3
  D1 --> B8

  class A1,B1,B13 terminal
  class A2,A6,B4,B7,B11 decision
  class A5,A11,A13,B3,B5,B6,B12 machine
  class A7,A12,B8,B9 ai
  class A3,A4,A8,A9,A10 artist
  class B2,B10 buyer
  class D1 datalayer`

