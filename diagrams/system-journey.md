%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#EEEDFE', 'primaryBorderColor': '#534AB7', 'primaryTextColor': '#26215C', 'lineColor': '#888780', 'secondaryColor': '#E1F5EE', 'tertiaryColor': '#FAEEDA', 'fontSize': '16px'}}}%%
flowchart TD
    classDef trigger fill:#fff3e0,stroke:#ff9800,stroke-width:2px,color:#e65100;
    classDef system fill:#e1f5fe,stroke:#0288d1,stroke-width:2px,color:#01579b;
    classDef database fill:#ffe082,stroke:#f57c00,stroke-width:2px,color:#5d4037;
    classDef gate fill:#ffcdd2,stroke:#c62828,stroke-width:2px,color:#b71c1c;

    subgraph Block_1 [1. The Physical Log]
        A["Archivist logs parameters\ninto /archive/matrix.csv"] --> B["Capture Sourcing\nMaterial Keys & Labour Splits"]
    end
    subgraph Block_2 [2. The Digital File Scan]
        C["Image files added\nto folder"] --> D["watch.py triggers\nlocal analysis"]
        D --> D1["OpenCV calculates\nLaplacian Edge Variance\n(Aesthetic Entropy)"]
        D --> D2["NumPy computes\nWavelength Histograms\n(Colour Temperature Waves)"]
        D --> D3["Ollama running\nLlava Local Vision Model\n(Visual Style Tags)"]
    end
    subgraph Block_3 [3. The Data Merger]
        B --> F["Python compiler combines\nCSV + JSON Arrays"]
        D1 & D2 & D3 --> F
        F --> G[("(static /data/manifest.json)")]
    end
    subgraph Block_4 [4. The Interface Display]
        G --> H["Fetch manifest array\ninto client application state"]
        I1["User adjusts tactile\nFinancial Speculation dial"] --> H
        I2["User calibrates\nPlanet-Centred slider"] --> H
        I3["User balances\nEthical equity slider"] --> H
        I4["Dials register\nAesthetic Entropy\n& Colour Waves"] --> H
    end
    subgraph Block_5 [5. The Balance Check]
        H --> J{"Evaluate Multi-Axis\nEquilibrium"}
        J -->|"Speculation > Planet +\nEthical + Colour Constraints"| K["State: ASYMMETRY LOCKOUT\nHalt Viewport Grid Render"]
        J -->|"All Balanced\nConstraints Passed"| L["Illuminate Verified\nVariant on Grid"]
    end

    class A,C,I1,I2,I3,I4 trigger; class B,D,D1,D2,D3,H,J,L system; class F,G database; class K gate;

<p>Every time you drop a batch of new images into your local storage folder, the ingestion script wakes up. It doesn't interpret the artistic meaning of the images; it reads them purely for structural parameters. It looks at each image file and executes three distinct calculations in sequence.</p>
<p>First, it runs a pixel-edge contrast algorithm to determine the mathematical complexity of the image, assigning it an Entropy Score. Second, it groups the pixel colors into a histogram to map the ratio of cool to warm wavelengths. Third, it passes the image to a local, offline vision model running via Ollama to pull objective keyword tags—"geometric, floral, minimal". It appends these metrics as a clean, raw line item in your spreadsheet.</p>
<p>The second part of the ledger relies entirely on your own physical knowledge of the object. You open the spreadsheet and log the raw material truth of the piece: base medium, shipping footprint distance, and the gallery split. Once you run the local compiler, this spreadsheet collapses into a single, clean structured JSON database file.</p>
<p>The dashboard itself is governed by a strict mathematical law: System Balance. If you move the Commercial Speculation slider past 70% to chase market value, the runtime logic hits a hard brake if the material is synthetic. The dashboard refuses to process the query, entering an Extractive Lockout, emitting a low-frequency ambient drone until you balance the scales. Once the internal equations balance out cleanly, the gate opens, rendering your perfect matching art piece.</p>
