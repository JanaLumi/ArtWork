title: "System Journey — The Story of the System",
text: `<p>Every time you drop a batch of new images into your local storage folder, the ingestion script wakes up. It doesn't interpret the artistic meaning of the images; it reads them purely for structural parameters. It looks at each image file and executes three distinct calculations in sequence.</p>
       <p>First, it runs a pixel-edge contrast algorithm to determine the mathematical complexity of the image, assigning it an Entropy Score. Second, it groups the pixel colors into a histogram to map the ratio of cool to warm wavelengths. Third, it passes the image to a local, offline vision model running via Ollama to pull objective keyword tags—"geometric, floral, minimal". It appends these metrics as a clean, raw line item in your spreadsheet.</p>
       <p>The second part of the ledger relies entirely on your own physical knowledge of the object. You open the spreadsheet and log the raw material truth of the piece: base medium, shipping footprint distance, and the gallery split. Once you run the local compiler, this spreadsheet collapses into a single, clean structured JSON database file.</p>
       <p>The dashboard itself is governed by a strict mathematical law: System Balance. If you move the Commercial Speculation slider past 70% to chase market value, the runtime logic hits a hard brake if the material is synthetic. The dashboard refuses to process the query, entering an Extractive Lockout, emitting a low-frequency ambient drone until you balance the scales. Once the internal equations balance out cleanly, the gate opens, rendering your perfect matching art piece.</p>`,
code: `flowchart TD
  %%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#EEEDFE', 'primaryBorderColor': '#534AB7', 'primaryTextColor': '#26215C', 'lineColor': '#888780', 'secondaryColor': '#E1F5EE', 'fontSize': '16px'}}}%%
  classDef trigger fill:#fff3e0,stroke:#ff9800,stroke-width:2px,color:#e65100;
  classDef system fill:#e1f5fe,stroke:#0288d1,stroke-width:2px,color:#01579b;
  classDef database fill:#ffe082,stroke:#f57c00,stroke-width:2px,color:#5d4037;
  classDef gate fill:#ffcdd2,stroke:#c62828,stroke-width:2px,color:#b71c1c;

  subgraph Step_1 [1. The Local Scan Cycle]
      A[User drops files into raw directory] ---> B[Trigger Ingestion Script]
      B --> C[Ollama Local Vision Model]
      C --> D[Extract Entropy & Color Hex Arrays]
  end
  subgraph Step_2 [2. Material Audit Ledger]
      D ---> G[Auto-Append to local spreadsheet]
      H[User Input: Manual Material Sourcing Audit] --> G
      G --> I[(Compile Static JSON Database File)]
  end
  subgraph Step_3 [3. The Balance Interlock]
      I --> J[Load into Browser Memory Dashboard]
      K[User Adjusts Cockpit Control Panel] --> J
      J --> L{The Operational Governor Check}
      L -->|Speculation > Sustainability| M[State: EXTRACTIVE LOCKOUT <br> Trigger Lockout Mode]
      L -->|Constraints Passed| N[Execute Array Filters]
      N --> O[Illuminate Verified Art Variant]
  end
  class A,H,K trigger; class B,C,D,J,L,N,O system; class G,I database; class M gate;`
