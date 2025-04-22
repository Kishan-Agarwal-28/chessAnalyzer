from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from fastapi import Request
import chess
import chess.engine
import chess.pgn
import os
from main import analyze_position, get_human_readable_analysis, setup_gemini
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI()

# Mount static files and templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Initialize Stockfish and Gemini
STOCKFISH_PATH = os.path.join(os.path.dirname(__file__), 'engines', 'stockfish', 'stockfish-windows-x86-64-avx2.exe')
try:
    engine = chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH)
except Exception as e:
    print(f"Error initializing Stockfish: {e}")
    raise HTTPException(status_code=500, detail="Failed to initialize chess engine")

# Get Gemini API key from environment
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable not set")

try:
    model = setup_gemini(GEMINI_API_KEY)
except Exception as e:
    print(f"Error initializing Gemini: {e}")
    raise HTTPException(status_code=500, detail="Failed to initialize Gemini model")

@app.get("/", response_class=HTMLResponse)
async def get_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    board = chess.Board()
    
    try:
        while True:
            data = await websocket.receive_json()
            command = data.get("command")
            
            if command == "analyze_position":
                fen = data.get("fen")
                if not fen:
                    await websocket.send_json({"type": "error", "message": "FEN position required"})
                    continue
                    
                try:
                    board.set_fen(fen)
                except ValueError:
                    await websocket.send_json({"type": "error", "message": "Invalid FEN position"})
                    continue
                
                try:
                    # Get position analysis with multiple variations
                    score, pv, best_move = analyze_position(engine, board)
                    
                    # Get human readable analysis
                    last_move = data.get("last_move")
                    player_color = "White" if board.turn == chess.BLACK else "Black"
                    analysis = get_human_readable_analysis(model, (score, pv, best_move), last_move, player_color)
                    
                    # Format moves for arrow display
                    variations = []
                    if pv:
                        for move in pv[:3]:  # Get top 3 moves for arrows
                            variations.append(str(move))
                    
                    await websocket.send_json({
                        "type": "analysis",
                        "score": score,
                        "bestMove": best_move,
                        "analysis": analysis,
                        "pv": variations
                    })
                except Exception as e:
                    print(f"Analysis error: {e}")
                    await websocket.send_json({"type": "error", "message": f"Analysis failed: {str(e)}"})
                
            elif command == "reset":
                board.reset()
                await websocket.send_json({"type": "reset_confirmed"})
                
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        try:
            await websocket.close()
        except:
            pass

@app.on_event("shutdown")
def shutdown_event():
    engine.quit()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)