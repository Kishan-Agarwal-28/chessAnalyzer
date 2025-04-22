# Chess Analyzer

A real-time chess analysis tool that combines Stockfish engine evaluation with visual move suggestions and piece influence visualization.

## Features

- Real-time position analysis using Stockfish engine
- Interactive chessboard with move validation
- Visual representation of:
  - Played moves (Green arrows)
  - Attacked squares (Red highlights)
  - Protected pieces (Blue highlights)
  - Stockfish's suggested moves (Orange arrows)
  - Potential attacks after best move (Yellow highlights)
  - Potential protections after best move (Purple arrows)
- PGN game import and analysis
- Move navigation with arrow keys
- Evaluation bar showing current position score
- Detailed position analysis using AI

## Prerequisites

- Python 3.11 or higher
- Stockfish chess engine (included)
- Modern web browser with WebSocket support
- uv installed and configured in your system

## Installation
1. Clone the repository :
```bash
git clone https://github.com/yourusername/chessAnalyzer.git
cd chessAnalyzer
```
3. Install dependencies:
 
  `Please install stockfish for your system from their website in the engines/stockfish folder to run this project.`


4. Set up environment variables:
Create a `.env` file in the project root with:
```
GEMINI_API_KEY=your_gemini_api_key_here
```

## Usage

1. Start the server:
```bash
uv run server.py
```

2. Open your web browser and navigate to:
```
http://localhost:8000
```

3. Use the interface to:
   - Load a PGN game for analysis
   - Play moves on the board
   - Navigate through moves using arrow keys or buttons
   - View Stockfish analysis and suggestions
   - See piece influence visualization

## API Documentation

### WebSocket Endpoints

#### `/ws`
- Handles real-time communication for position analysis
- Messages:
  - `analyze_position`: Analyzes current board position
    ```json
    {
        "command": "analyze_position",
        "fen": "current_position_fen",
        "last_move": "optional_last_move"
    }
    ```
  - Response:
    ```json
    {
        "type": "analysis",
        "score": float,
        "bestMove": "string",
        "analysis": "string",
        "pv": ["move1", "move2", ...]
    }
    ```

### REST Endpoints

#### GET `/`
- Returns the main application interface
- Response: HTML

## Project Structure

```
├── server.py           # FastAPI server implementation
├── main.py            # Core analysis functions
├── static/            # Static assets
│   ├── css/          # Stylesheets
│   └── js/           # JavaScript files
├── templates/         # HTML templates
└── engines/          # Chess engines
    └── stockfish/    # Stockfish engine files
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License

Copyright (c) 2024 [Your Name]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Acknowledgments

- [Stockfish](https://stockfishchess.org/) - The powerful chess engine used for analysis
- [chess.js](https://github.com/jhlywa/chess.js) - JavaScript chess library
- [chessboard.js](https://chessboardjs.com/) - JavaScript chessboard UI
- [FastAPI](https://fastapi.tiangolo.com/) - The web framework used