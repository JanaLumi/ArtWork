title: "Buyer's Journey — the story of what happens",
text: `<p>You are looking for something to live with. Not to store. Not to invest in quietly and forget. Something to put on a wall you actually inhabit.</p>
       <p>You open the discovery interface. You don't start with a search bar. You start with context — what kind of light does the space have, what are the colours already in the room, what level of visual complexity do you want to live with every day. The interface responds to what you tell it about the space, not just what you tell it about your taste.</p>
       <p>Works begin to appear. You can slow down or move quickly. If something stops you, you can go further — see how it holds up under different light conditions, imagine it in the proportions of your actual wall, read the material record the artist entered. Not a marketing description. The actual materials, where they came from, how the piece was made.</p>
       <p>At some point you might want to know what this work is worth over time. Whether it holds value. Whether the artist is building a serious body of work. That information is available — but it's coupled to something else. To raise the financial speculation filter, you have to raise the Planetary Threshold filter alongside it. The system won't let you optimise purely for investment without also committing to ecological criteria. The two move together. This isn't a lecture. It's just how the system is built.</p>
       <p>What you see on the Planetary Threshold isn't a score. It's a position — where this piece sits across several variables at once. Shipping distance from the work's origin to where you are. Material source. Studio practices. These are trade-offs, not verdicts. You decide what you're willing to carry.</p>
       <p>When you find the work you're looking for, the platform points you to the artist's own site. That's where everything else happens. The platform found the match. The rest is between you and the artist.</p>`,
code: `flowchart TD
  %%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#EEEDFE', 'primaryBorderColor': '#534AB7', 'primaryTextColor': '#26215C', 'lineColor': '#888780', 'secondaryColor': '#E1F5EE', 'fontSize': '13px'}}}%%
  classDef trigger fill:#EF9F27,stroke:#b87000,color:#fff
  classDef machine fill:#1D9E75,stroke:#0F6E56,color:#E1F5EE
  classDef decision fill:#7F77DD,stroke:#534AB7,color:#EEEDFE
  classDef ai fill:#F4C0D1,stroke:#c47090,color:#4B1528
  classDef buyer fill:#AAC1BF,stroke:#6a9490,color:#1a3330
  classDef terminal fill:#888780,stroke:#5F5E5A,color:#F1EFE8

  START(["buyer enters the discovery interface"])
  START --> CONTEXT["buyer sets space context\nlight · room colours · wall size"]
  CONTEXT --> MACHINE1["machine filters catalogue\nagainst space parameters"]
  MACHINE1 --> BROWSE{"browse or\ngo deeper?"}
  BROWSE -->|"browse"| GRID["works appear\nmove quickly through the grid"]
  BROWSE -->|"pause"| DETAIL["slow down\nlighting simulation · material record · artist info"]
  GRID & DETAIL --> SPECQ{"factor in\nfinancial value?"}
  SPECQ -->|"no"| THRESHOLD1["AI shows planetary threshold\nshipping from origin to buyer · materials · studio practices"]
  SPECQ -->|"yes"| COUPLED["raise speculation filter\nplanetary threshold rises with it\ncannot be separated"]
  COUPLED --> THRESHOLD1
  THRESHOLD1 --> TRADEOFFS["buyer sees trade-offs\nnot a verdict · a position\nbuyer decides what to carry"]
  TRADEOFFS --> FOUND{"right work\nfound?"}
  FOUND -->|"no"| BROWSE
  FOUND -->|"yes"| REFERRAL["platform points to artist's own site\ntransaction happens there\non the artist's terms"]
  REFERRAL --> END(["buyer and artist connect directly"])

  class START,END terminal
  class CONTEXT,GRID,DETAIL,TRADEOFFS,REFERRAL buyer
  class MACHINE1 machine
  class BROWSE,SPECQ,FOUND decision
  class COUPLED,THRESHOLD1 ai`

