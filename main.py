import chess
import chess.pgn
import chess.engine
import google.generativeai as genai
import io
import os
from typing import Tuple, List

# Default path for Stockfish
DEFAULT_STOCKFISH_PATH = os.path.join(os.path.dirname(__file__), 'engines', 'stockfish', 'stockfish-windows-x86-64-avx2.exe')

def setup_gemini(api_key):
    print("Setting up Gemini...")
    # Configure the Gemini API with safety settings
    genai.configure(api_key=api_key)
    
    # Set up the model with the correct generation config
    generation_config = {
        "temperature": 0.7,
        "top_p": 0.8,
        "top_k": 40
    }
    
    # Note: Using the correct model name for the latest API version
    model = genai.GenerativeModel(model_name="gemini-2.0-flash",
                                generation_config=generation_config)
    print("Gemini setup complete")
    return model

def analyze_position(engine: chess.engine.SimpleEngine, board: chess.Board, depth: int = 20) -> Tuple[float, List[str], str]:
    """
    Analyze a chess position using Stockfish engine.
    
    Args:
        engine: Stockfish engine instance
        board: Current chess position
        depth: Analysis depth
        
    Returns:
        Tuple containing:
        - score (float): Position evaluation in pawns
        - variations (List[str]): Principal variations
        - best_move (str): Best move in UCI format
    """
    # Get analysis from engine
    info = engine.analyse(board, chess.engine.Limit(depth=depth), multipv=3)
    
    # Extract the score from principal variation
    score = info[0]["score"].relative.score(mate_score=10000)
    if score is None:  # Handle mate scores
        mate = info[0]["score"].relative.mate()
        score = 10000 if mate > 0 else -10000
    score = score / 100  # Convert centipawns to pawns
    
    # Extract variations
    variations = []
    for pv in info:
        variation = []
        current_board = board.copy()
        for move in pv["pv"]:
            san = current_board.san(move)
            variation.append(san)
            current_board.push(move)
        variations.append(" ".join(variation))
    
    # Get best move in UCI format
    best_move = info[0]["pv"][0].uci()
    
    return score, variations, best_move

def get_human_readable_analysis(model, position_info, move, player_color):
    print(f"Getting human readable analysis for move: {move}")
    score, best_line, best_move = position_info
    best_moves = " ".join([str(m) for m in best_line[:3]])
    
    # Determine move quality based on score difference
    evaluation = ""
    if abs(score) < 0.5:
        evaluation = "Equal position"
    elif score > 2:
        evaluation = "Excellent move!" if score > 0 else "Blunder"
    elif score > 1:
        evaluation = "Good move" if score > 0 else "Mistake"
    elif score > 0.5:
        evaluation = "Solid move" if score > 0 else "Inaccuracy"
    
    prompt = f"""
    As a chess.com analyzer, provide a brief analysis of this position:
    Move: {move} by {player_color}
    Evaluation: {evaluation} (Score: {score:+.2f})
    Stockfish's best move: {best_move}
    Best continuation: {best_moves}

    Write a concise, one or two sentence analysis in this format:
    1. Start with the move quality (Excellent/Good/Solid/Inaccuracy/Mistake/Blunder)
    2. Explain WHY the move is good/bad in simple terms
    3. If not the best move, mention that Stockfish suggests {best_move}
    4. Keep it very concise and beginner-friendly
    5. Don't repeat yourself
    6. Avoid using chess jargon or complex terms
    7. Use a friendly and encouraging tone
    8. Use bullet points for clarity
    9. Use simple language and short sentences
     10. You have to tell that this move is from which book move 
    Example style:
    "* Sicilian Defense: Najdorf Variation.
    * Excellent move! This controls the center and develops the bishop to an active square."
    "* Sicilian Defense: Najdorf Variation.
     * Inaccuracy. This weakens the kingside pawns. Stockfish suggests Nf3, maintaining control of e5."
    """

    
    try:
        response = model.generate_content(prompt)
        print("Successfully generated analysis")
        return response.text.strip()
    except Exception as e:
        print(f"Error generating analysis: {e}")
        return f"Error analyzing position: {e}"

def analyze_game(pgn_string, stockfish_path, gemini_api_key):
    print("Starting game analysis...")
    print(f"Using Stockfish at: {stockfish_path}")
    
    # Initialize engines and models
    try:
        engine = chess.engine.SimpleEngine.popen_uci(stockfish_path)
        print("Stockfish engine initialized")
    except Exception as e:
        print(f"Error initializing Stockfish: {e}")
        return f"Failed to initialize Stockfish: {e}"
    
    try:
        model = setup_gemini(gemini_api_key)
    except Exception as e:
        engine.quit()
        print(f"Error initializing Gemini: {e}")
        return f"Failed to initialize Gemini: {e}"
    
    # Parse PGN
    print("Parsing PGN...")
    game = chess.pgn.read_game(io.StringIO(pgn_string))
    if game is None:
        print("Invalid PGN format")
        engine.quit()
        return "Invalid PGN format"
    
    print("PGN parsed successfully")
    analysis = []
    board = game.board()
    
    try:
        for move_number, move in enumerate(game.mainline_moves(), 1):
            print(f"\nAnalyzing move {move_number}...")
            player_color = "White" if board.turn == chess.WHITE else "Black"
            
            # Analyze position before making the move
            position_info = analyze_position(engine, board)
            
            # Make the move
            board.push(move)
            
            # Get human readable analysis
            move_analysis = get_human_readable_analysis(
                model, 
                position_info, 
                move, 
                player_color
            )
            
            analysis.append(f"Move {move_number}. {player_color}: {move}\n{move_analysis}\n")
            print(f"Move {move_number} analysis complete")
    except Exception as e:
        print(f"Error during analysis: {e}")
        engine.quit()
        return f"Analysis failed: {e}"
    
    print("Analysis complete, closing engine...")
    engine.quit()
    return "\n".join(analysis)

def main():
    print("\n=== Chess Game Analyzer ===\n")
    # Example usage
    stockfish_path = input(f"Enter the path to Stockfish engine (press Enter to use default: {DEFAULT_STOCKFISH_PATH}): ").strip()
    if not stockfish_path:
        stockfish_path = DEFAULT_STOCKFISH_PATH
    
    if not os.path.exists(stockfish_path):
        print(f"Error: Stockfish not found at {stockfish_path}")
        print("Please download Stockfish from https://stockfishchess.org/download/ and place it in the engines folder")
        return
        
    gemini_api_key = input("Enter your Gemini API key: ")
    pgn_string = input("Enter your PGN: ")
    
    print("\nStarting analysis...")
    try:
        analysis = analyze_game(pgn_string, stockfish_path, gemini_api_key)
        print("\nGame Analysis:")
        print(analysis)
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()