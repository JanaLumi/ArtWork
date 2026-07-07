%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#EEEDFE', 'primaryBorderColor': '#534AB7', 'primaryTextColor': '#26215C', 'lineColor': '#888780', 'secondaryColor': '#E1F5EE', 'tertiaryColor': '#FAEEDA', 'fontSize': '16px'}}}%%
flowchart TD
    
    subgraph P1 [1. The Physical Log]
        A1["/archive/matrix.csv"] ---> A2["Sourcing Origin Audit"]
        A1 ---> A3["Labour & Split Registry"]
    end

    subgraph P2 [2. The Digital File Scan]
        B1["/archive/masters/\nDirectory"] ---> B2["watch.py Daemon Process"]
        B2 ---> B3["OpenCV / NumPy\nAnalysis Engine"]
        B2 ---> B4["Ollama Local\nLLava Daemon"]
    end

    subgraph P3 [3. The Data Merger]
        A2 & A3 ---> C1["Manifest Compiler Script"]
        B3 & B4 ---> C1
        C1 ---> C2[("(Static Serialization:\nmanifest.json)")]
    end

    subgraph P4 [4. The Interface Display]
        C2 ---> D1["Client Application\nMemory State"]
        subgraph D2 [Tactile Control Enclosure]
            D2a["Financial Speculation\nDial"]
            D2b["Planet-Centred\nSlider"]
            D2c["Ethical Equity\nSlider"]
            D2d["Aesthetic Entropy\nDisplay"]
            D2e["Colour Temperature\nWave Meters"]
        end
        D2a & D2b & D2c & D2d & D2e ---> D1
    end

    subgraph P5 [5. The Balance Check]
        D1 ---> E1{"Equilibrium\nInterlock Loop"}
        E1 --->|"Speculation\nOver-Extraction"| E2["Asymmetry Lockout:\nHalt Processing"]
        E1 --->|"Verified Balance\nCompliance"| E3["Render Filtered Viewport\nGrid Matrix"]
    end
