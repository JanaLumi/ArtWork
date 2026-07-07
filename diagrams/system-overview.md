title: "System Overview",
text: `<p>This structural overview outlines the five functional phases comprising the complete software architecture ecosystem. It visualizes the total map layout from initial client-side storage files down to the final conditional browser rendering array.</p>
       <p>Phase 1 handles data extraction through localized models, mapping metadata vectors without external network dependency. Phase 2 joins these values against your audited environmental indicators to construct a complete sustainability profile.</p>
       <p>Phase 3 acts as the localized translation layout where physical structural CSV modifications compile cleanly down into an indexable data block. Phase 4 and Phase 5 represent the client-side system interface layer, operating on client-side memory loops to run continuous mathematical confirmation routines before any visual data blocks map onto the viewport display matrix.</p>`,
code: `flowchart TD
  %%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#EEEDFE', 'primaryBorderColor': '#534AB7', 'primaryTextColor': '#26215C', 'lineColor': '#888780', 'secondaryColor': '#E1F5EE', 'fontSize': '13px'}}}%%
  subgraph P1 [Phase 1: Local Ingestion Engine]
      Direction_A[Local File Scan Layer] --> Direction_B[Local Automated Vision Extraction]
  end
  subgraph P2 [Phase 2: Carbon & Material Matrix]
      Direction_C[Studio Audits] --> Direction_D[Sourcing & Labor Calculations]
  end
  subgraph P3 [Phase 3: The Intermediate Serialization]
      P1 & P2 --> Direction_E[System Spreadsheet Pipeline] --> Direction_F[(Structured JSON Archive Data)]
  end
  subgraph P4 [Phase 4: Client Interface Controls]
      Direction_F --> Direction_G[Neumorphic Cockpit Viewport]
  end
  subgraph P5 [Phase 5: Safety Matrix & Output]
      Direction_G --> Direction_H{The Earth Debt Governor Gate}
      Direction_H -->|Verified Compliance| Direction_I[Render Filtered Grid Engine]
  end`
