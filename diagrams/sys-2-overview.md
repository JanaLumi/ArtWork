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

  subgraph A ["👩🏽‍🎨 Phase 1 — Artist Ingestion"]
    A1(["artwork enters the system"])
    A1 --> A2{"batch or single?"}
    A2 -->|"batch"| A3["folder + CSV"]
    A2 -->|"single"| A4["one piece"]
    A3 & A4 --> A5["machine reads each image\ncomplexity · colour · no network"]
  end

  subgraph B ["🎚️ Phase 2 — AI Assistance (opt-in)"]
    A5 --> B1{"opt in to\nAI per field?"}
    B1 -->|"yes"| B2["AI suggests\ntitle · tags · price"]
    B2 --> B3["artist reviews\naccept · edit · reject"]
    B1 -->|"no"| B4["artist fills\nall fields"]
    B3 & B4 --> B5["artist enters material truth\nmedium · sourcing · location · gallery split\nonly artist can do this"]
  end

  subgraph C ["⚙️ Phase 3 — Serialisation"]
    B5 --> C1["machine compiles to JSON\nlocal · static · yours"]
    C1 --> C2["AI generates planetary threshold profile\nmultivariate · trade-offs visible · not a verdict"]
    C2 --> C3["artist adds link to own site"]
    C3 --> C4[("shared data layer\nJSON · threshold profile · artist site link")]
  end

  subgraph D ["🛒 Phase 4 — Buyer Discovery"]
    C4 --> D1(["buyer enters discovery interface"])
    D1 --> D2["buyer sets space context\nlight · colours · wall size"]
    D2 --> D3["machine filters catalogue\nagainst space parameters"]
    D3 --> D4{"browse or\ngo deeper?"}
    D4 -->|"browse"| D5["works appear\nmove through the grid"]
    D4 -->|"pause"| D6["lighting simulation\nmaterial record · artist info"]
  end

  subgraph E ["🌍 Phase 5 — Planetary Threshold & Referral"]
    D5 & D6 --> E1{"factor in\nfinancial value?"}
    E1 -->|"no"| E2["AI shows planetary threshold\nshipping · materials · studio practices"]
    E1 -->|"yes"| E3["raise speculation filter\nplanetary threshold rises with it\ncannot be separated"]
    E3 --> E2
    E2 --> E4["buyer sees trade-offs\nnot a verdict · a position\nbuyer decides what to carry"]
    E4 --> E5{"right work\nfound?"}
    E5 -->|"no"| D4
    E5 -->|"yes"| E6["platform points to artist's own site\ntransaction on artist's terms"]
    E6 --> E7(["buyer and artist connect directly"])
  end

  class A1,D1,E7 terminal
  class A2,B1,D4,E1,E5 decision
  class A5,C1,C3,D3,D5,D6,E6 machine
  class B2,C2,E2,E3 ai
  class A3,A4,B3,B4,B5 artist
  class D2,E4 buyer
  class C4 datalayer`

