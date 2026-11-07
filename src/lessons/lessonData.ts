import type { Chapter } from "./types";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export const CHAPTERS: Chapter[] = [
  {
    id: "board",
    title: "Meet the Chessboard",
    description: "Files, ranks, and how the board is set up.",
    lessons: [
      {
        id: "coordinates",
        chapterId: "board",
        title: "Files, Ranks, and Coordinates",
        summary: "Learn how every square gets its name.",
        watch: [
          {
            caption: "The chessboard has 8 columns, called files, labeled a through h.",
            fen: START_FEN,
            highlightSquares: ["a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8"],
          },
          {
            caption: "It also has 8 rows, called ranks, numbered 1 through 8.",
            fen: START_FEN,
            highlightSquares: ["a1", "b1", "c1", "d1", "e1", "f1", "g1", "h1"],
          },
          { caption: "Every square gets its name from its file and rank. This one's e4.", fen: START_FEN, highlightSquares: ["e4"] },
          { caption: "White always moves first, and the board is set up the same way every game.", fen: START_FEN },
        ],
        tryIt: {
          instructions: "Tap the square e4 to find it on the board.",
          fen: START_FEN,
          kind: "find",
          targetSquare: "e4",
          successMessage: "That's e4. The e-file, 4th rank.",
        },
        challenge: {
          instructions: "Now find d5 on your own.",
          fen: START_FEN,
          kind: "find",
          targetSquare: "d5",
          successMessage: "You found d5.",
          hint: "Count 4 files from the left (a-b-c-d), then 5 rows up.",
        },
      },
    ],
  },
  {
    id: "pieces",
    title: "Meet the Pieces",
    description: "How each piece moves and captures.",
    lessons: [
      {
        id: "pawn",
        chapterId: "pieces",
        title: "The Pawn",
        summary: "Moves straight, captures diagonally.",
        watch: [
          { caption: "A pawn moves straight ahead, one square at a time.", fen: "rnbqkbnr/pppppppp/8/8/8/4P3/PPPP1PPP/RNBQKBNR b KQkq - 0 1" },
          {
            caption: "On its very first move, a pawn may advance two squares instead of one.",
            fen: "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1",
          },
          { caption: "Pawns capture diagonally. Never straight ahead.", fen: "4k3/8/8/3p1p2/4P3/8/8/4K3 w - - 0 1", highlightSquares: ["d5", "f5"] },
          {
            caption:
              "Why it matters: pawns help control space and protect your other pieces. When they capture or move forward, they can open lines for stronger pieces - and a pawn that reaches the far side can promote, usually into a queen.",
            fen: "4k3/8/8/3p1p2/4P3/8/8/4K3 w - - 0 1",
            highlightSquares: ["d5", "f5"],
          },
        ],
        tryIt: {
          instructions: "Move the pawn on e2 forward. One or two squares, your choice.",
          fen: START_FEN,
          kind: "move",
          pieceSquare: "e2",
          successMessage: "A pawn's two opening moves: one square, or two from its start.",
        },
        challenge: {
          instructions: "White to move. Capture the undefended black pawn.",
          fen: "4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1",
          kind: "move",
          isGoalMove: (_chess, move) => move.from === "e4" && move.to === "d5",
          successMessage: "Exd5. Pawns capture diagonally, so that pawn was always in danger.",
          hint: "Look at what your e-pawn can capture diagonally.",
        },
      },
      {
        id: "knight",
        chapterId: "pieces",
        title: "The Knight",
        summary: "Jumps in an L-shape, and can leap over pieces.",
        watch: [
          {
            caption: "The knight moves in an L-shape: two squares one way, then one square to the side.",
            fen: "rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 1 1",
          },
          {
            caption: "A knight is the only piece that can jump over other pieces in its way.",
            fen: "rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 1 1",
            highlightSquares: ["f3", "g1"],
          },
          {
            caption: "From f3, the knight can reach any of these squares.",
            fen: "rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 1 1",
            highlightSquares: ["d4", "e5", "g5", "h4", "g1"],
          },
          {
            caption:
              "Why it matters: because a knight jumps over other pieces, it can stay dangerous even in crowded positions - and its unusual movement makes it especially good at attacking two targets at once with a fork.",
            fen: "rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 1 1",
            highlightSquares: ["d4", "e5", "g5", "h4", "g1"],
          },
        ],
        tryIt: {
          instructions: "Move the knight on g1 to any square it can legally reach.",
          fen: START_FEN,
          kind: "move",
          pieceSquare: "g1",
          successMessage: "That's a legal knight move. Always an L-shape.",
        },
        challenge: {
          instructions: "White to move. Capture the undefended black knight in one move.",
          fen: "4k3/8/2n5/8/3N4/8/8/4K3 w - - 0 1",
          kind: "move",
          isGoalMove: (_chess, move) => move.from === "d4" && move.to === "c6",
          successMessage: "Nxc6. The knight's L-shaped jump found an undefended piece.",
          hint: "From d4, which knight jump lands on a black piece?",
        },
      },
      {
        id: "bishop",
        chapterId: "pieces",
        title: "The Bishop",
        summary: "Glides diagonally, staying on one color forever.",
        watch: [
          { caption: "A bishop moves diagonally, any number of squares.", fen: "rnbqkbnr/pppp1ppp/8/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR b KQkq - 1 2" },
          {
            caption: "Each bishop stays on the same color square for its entire game.",
            fen: "rnbqkbnr/pppp1ppp/8/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR b KQkq - 1 2",
            highlightSquares: ["b5", "a6", "d5", "e6", "f7", "d3", "e2", "f1"],
          },
          {
            caption:
              "Why it matters: bishops are strongest when they have open diagonals and clear lines across the board. Each bishop stays on one square color, so blocked diagonals can limit how useful it becomes.",
            fen: "rnbqkbnr/pppp1ppp/8/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR b KQkq - 1 2",
            highlightSquares: ["b5", "a6", "d5", "e6", "f7", "d3", "e2", "f1"],
          },
        ],
        tryIt: {
          instructions: "Move the bishop on f1 anywhere it can legally go.",
          fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
          kind: "move",
          pieceSquare: "f1",
          successMessage: "A clean diagonal move. That's how bishops travel.",
        },
        challenge: {
          instructions: "White to move. Capture the undefended black bishop.",
          fen: "4k3/8/4b3/8/2B5/8/8/4K3 w - - 0 1",
          kind: "move",
          isGoalMove: (_chess, move) => move.from === "c4" && move.to === "e6",
          successMessage: "Bxe6. The diagonal was wide open, and the bishop was undefended.",
          hint: "Follow the diagonal from c4 as far as it can go.",
        },
      },
      {
        id: "rook",
        chapterId: "pieces",
        title: "The Rook",
        summary: "Glides in straight lines, any distance.",
        watch: [
          {
            caption: "A rook moves in straight lines - up, down, left, or right - any number of squares.",
            fen: "4k3/8/8/8/3R4/8/8/4K3 w - - 0 1",
            highlightSquares: ["d1", "d8", "a4", "h4"],
          },
          {
            caption: "Unlike the bishop, a rook can reach every square on its own file and rank.",
            fen: "4k3/8/8/8/3R4/8/8/4K3 w - - 0 1",
            highlightSquares: ["d2", "d3", "d5", "d6", "d7", "a4", "b4", "c4", "e4", "f4", "g4", "h4"],
          },
          {
            caption:
              "Why it matters: rooks are especially powerful on open files and ranks, where nothing blocks their path. They often become more active as pieces are exchanged and the board opens up.",
            fen: "4k3/8/8/8/3R4/8/8/4K3 w - - 0 1",
            highlightSquares: ["d2", "d3", "d5", "d6", "d7", "a4", "b4", "c4", "e4", "f4", "g4", "h4"],
          },
        ],
        tryIt: {
          instructions: "Move the rook on d4 anywhere it can legally go.",
          fen: "4k3/8/8/8/3R4/8/8/4K3 w - - 0 1",
          kind: "move",
          pieceSquare: "d4",
          successMessage: "A clean straight-line move. That's how rooks travel.",
        },
        challenge: {
          instructions: "White to move. Capture the undefended black rook.",
          fen: "4k3/8/8/8/3r4/8/3R4/4K3 w - - 0 1",
          kind: "move",
          isGoalMove: (_chess, move) => move.from === "d2" && move.to === "d4",
          successMessage: "Rxd4. The file was wide open, so the rook marched straight up it.",
          hint: "Look straight up the d-file from your rook.",
        },
      },
      {
        id: "queen",
        chapterId: "pieces",
        title: "The Queen",
        summary: "Combines the rook and bishop - the most powerful piece.",
        watch: [
          {
            caption: "The queen moves like a rook and a bishop combined: straight lines and diagonals, any distance.",
            fen: "4k3/8/8/8/3Q4/8/8/4K3 w - - 0 1",
            highlightSquares: ["d1", "d8", "a4", "h4", "a1", "h8", "a7", "g1"],
          },
          { caption: "She's the most powerful piece on the board - use her carefully.", fen: "4k3/8/8/8/3Q4/8/8/4K3 w - - 0 1" },
          {
            caption:
              "Why it matters: the queen is your most powerful piece, so keeping her safe is important. Bringing her out too early can make her an easy target, forcing you to waste time moving her away from attacks.",
            fen: "4k3/8/8/8/3Q4/8/8/4K3 w - - 0 1",
          },
        ],
        tryIt: {
          instructions: "Move the queen on d4 anywhere it can legally go.",
          fen: "4k3/8/8/8/3Q4/8/8/4K3 w - - 0 1",
          kind: "move",
          pieceSquare: "d4",
          successMessage: "Straight line or diagonal - the queen can do both.",
        },
        challenge: {
          instructions: "White to move. Capture the undefended black queen.",
          fen: "4k3/6q1/8/8/3Q4/8/8/4K3 w - - 0 1",
          kind: "move",
          isGoalMove: (_chess, move) => move.from === "d4" && move.to === "g7",
          successMessage: "Qxg7. The diagonal from d4 ran straight through to the undefended queen.",
          hint: "Follow the diagonal from d4 - where does it end up?",
        },
      },
      {
        id: "king",
        chapterId: "pieces",
        title: "The King & Check",
        summary: "One square at a time - and must always stay safe.",
        watch: [
          { caption: "The king moves one square in any direction.", fen: "7k/8/8/8/3K4/8/8/8 w - - 0 1" },
          {
            caption: "If the king is attacked, it's in check. Leaving your own king in check is illegal - you must respond to it with your very next move.",
            fen: "7k/8/8/8/8/8/8/r3K3 w - - 0 1",
            highlightSquares: ["a1", "e1"],
          },
          {
            caption:
              "Why it matters: during the opening and middlegame, keeping your king safe is a priority - castling helps protect it. In the endgame, when fewer pieces remain, your king can become an active fighting piece.",
            fen: "7k/8/8/8/8/8/8/r3K3 w - - 0 1",
            highlightSquares: ["a1", "e1"],
          },
        ],
        tryIt: {
          instructions: "Move the king one square in any direction.",
          fen: "7k/8/8/8/3K4/8/8/8 w - - 0 1",
          kind: "move",
          pieceSquare: "d4",
          successMessage: "One square, any direction. The king is slow, but it's the piece you must protect above all.",
        },
        challenge: {
          instructions: "White to move. Your king is in check - move it to safety.",
          fen: "7k/8/8/8/8/8/8/r3K3 w - - 0 1",
          kind: "move",
          isGoalMove: (_chess, move) => move.piece === "k",
          successMessage: "You moved out of check. That's the first rule when you're attacked: get safe.",
          hint: "Look for a square next to your king that the rook doesn't attack.",
        },
      },
    ],
  },
  {
    id: "special-moves",
    title: "Special Moves",
    description: "Castling, en passant, and pawn promotion.",
    lessons: [
      {
        id: "castling",
        chapterId: "special-moves",
        title: "Castling",
        summary: "Move your king and rook together, for safety.",
        watch: [
          {
            caption: "Castling lets the king and rook move together in a single move - for safety and speed.",
            fen: "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1",
            highlightSquares: ["e1", "h1"],
          },
          {
            caption: "The king moves two squares toward the rook, and the rook hops to the square right beside it.",
            fen: "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1",
            highlightSquares: ["e1", "f1", "g1", "h1"],
          },
          {
            caption: "A king can't castle out of check, through a square an enemy piece attacks, or into check on its landing square.",
            fen: "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1",
            highlightSquares: ["e1", "f1", "g1"],
          },
          {
            caption: "Two more requirements: neither the king nor that rook can have moved earlier in the game, and every square between them must be empty.",
            fen: "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1",
            highlightSquares: ["e1", "f1", "g1", "h1"],
          },
        ],
        tryIt: {
          instructions: "Castle kingside: move the king from e1 two squares toward the h1 rook.",
          fen: "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1",
          kind: "move",
          pieceSquare: "e1",
          successMessage: "That's castling - your king and rook moved together in one turn.",
        },
        challenge: {
          instructions: "White to move. Castle kingside.",
          fen: "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1",
          kind: "move",
          isGoalMove: (_chess, move) => move.san === "O-O",
          successMessage: "O-O! Your king is tucked away safely, and your rook joined the game.",
          hint: "The king and rook on the h-file (your right) can castle together.",
        },
      },
      {
        id: "en-passant",
        chapterId: "special-moves",
        title: "En Passant",
        summary: "A special pawn capture most beginners miss.",
        watch: [
          { caption: "A pawn on its first move can advance two squares at once.", fen: "4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1" },
          {
            caption: "If that two-square advance lands it right beside an enemy pawn, something special can happen.",
            fen: "4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2",
            highlightSquares: ["d5", "e5"],
          },
          {
            caption: "White can capture en passant: exd6, as if the black pawn had only moved one square.",
            fen: "4k3/8/3P4/8/8/8/8/4K3 b - - 0 2",
            highlightSquares: ["d6"],
          },
          {
            caption: "Timing matters: en passant is only legal on the very next move after that two-square advance. Wait one turn, and the chance is gone for good.",
            fen: "4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2",
            highlightSquares: ["d5", "e5"],
          },
        ],
        tryIt: {
          instructions: "Capture the black pawn en passant - it just moved two squares right beside yours.",
          fen: "4k3/8/4p3/3pP3/8/8/8/4K3 w - d6 1 2",
          kind: "move",
          pieceSquare: "e5",
          successMessage: "That's en passant: capturing a pawn that just passed yours, as though it had only moved one square.",
        },
        challenge: {
          instructions: "White to move. There are two ways to move this pawn - but only one captures the black pawn beside it.",
          fen: "4k3/8/8/3pP3/8/8/8/4K3 w - d6 1 2",
          kind: "move",
          isGoalMove: (_chess, move) => move.flags.includes("e"),
          successMessage: "Exd6 en passant! You spotted the one capture most beginners miss.",
          hint: "Look for a diagonal capture, even though no piece is sitting there yet.",
        },
      },
      {
        id: "promotion",
        chapterId: "special-moves",
        title: "Pawn Promotion",
        summary: "A pawn that reaches the far end becomes a new piece.",
        watch: [
          {
            caption:
              "When a pawn reaches the far end of the board, it must promote - becoming a queen, rook, bishop, or knight of its own color. It can never stay a pawn, and it can never become a king.",
            fen: "k7/4P3/8/8/8/8/8/4K3 w - - 0 1",
          },
          { caption: "Almost always, you'll choose a queen - the most powerful piece.", fen: "k3Q3/8/8/8/8/8/8/4K3 b - - 0 1" },
          {
            caption:
              "But you don't have to. Underpromoting to a rook, bishop, or knight is sometimes the better choice - for example, a knight's unique jumping move can deliver a check a queen couldn't, or a queen might accidentally stalemate your opponent when a different piece wouldn't.",
            fen: "k3Q3/8/8/8/8/8/8/4K3 b - - 0 1",
          },
        ],
        tryIt: {
          instructions: "Push the pawn on e7 all the way to the end of the board.",
          fen: "k7/4P3/8/8/8/8/8/4K3 w - - 0 1",
          kind: "move",
          pieceSquare: "e7",
          successMessage: "Queened! Pawns almost always promote to a queen, since she's the strongest piece.",
        },
        challenge: {
          instructions: "White to move. Promote your pawn - don't let it become anything less than a queen.",
          fen: "4k3/P7/8/8/8/8/8/4K3 w - - 0 1",
          kind: "move",
          isGoalMove: (_chess, move) => move.promotion === "q",
          successMessage: "A new queen is born! Promotion is one of the most powerful ideas in chess.",
          hint: "Push the pawn all the way - what does it become when it arrives?",
        },
      },
    ],
  },
  {
    id: "game-over",
    title: "Checkmate and Draws",
    description: "How games end: checkmate, stalemate, and the basic draw rules.",
    lessons: [
      {
        id: "checkmate",
        chapterId: "game-over",
        title: "Checkmate",
        summary: "The king is in check, with no way to escape.",
        watch: [
          {
            caption:
              "Checkmate ends the game: the king is in check, and there's no legal way to escape it - by moving the king, capturing the attacking piece, or blocking the attack.",
            fen: "R5k1/5ppp/8/8/8/8/8/4K3 b - - 0 1",
            highlightSquares: ["a8", "g8"],
          },
          {
            caption: "Here, none of those three escapes work: the king can't move, nothing can capture the rook, and nothing can block it.",
            fen: "R5k1/5ppp/8/8/8/8/8/4K3 b - - 0 1",
          },
        ],
        tryIt: {
          instructions: "Tap the black king. It's checkmated here - see why it has no escape.",
          fen: "R5k1/5ppp/8/8/8/8/8/4K3 b - - 0 1",
          kind: "find",
          targetSquare: "g8",
          successMessage: "Exactly - the king on g8 is checkmated. No legal move can save it.",
        },
        challenge: {
          instructions: "White to move. Find the move that checkmates the black king.",
          fen: "6k1/R4ppp/8/8/8/8/8/4K3 w - - 0 1",
          kind: "move",
          isGoalMove: (chess) => chess.isCheckmate(),
          successMessage: "Checkmate! Ra8# - the king had nowhere to go, nothing to block with, and nothing to capture.",
          hint: "The king is stuck in the corner by its own pawns - what move traps it completely?",
        },
      },
      {
        id: "stalemate-and-draws",
        chapterId: "game-over",
        title: "Stalemate & Other Draws",
        summary: "Sometimes nobody wins: stalemate, repetition, and more.",
        watch: [
          {
            caption:
              "Stalemate: the side to move has no legal move, but isn't in check. This is an automatic draw - not a loss, no matter how far ahead the other side is.",
            fen: "k7/8/1Q6/8/8/8/8/6K1 b - - 0 1",
          },
          {
            caption:
              "Threefold repetition is a draw you can claim: if the same position occurs three times, with the same player to move and the same legal possibilities, either player can claim a draw.",
            fen: "4k3/8/8/8/8/8/8/4K3 w - - 0 1",
          },
          {
            caption: "The 50-move rule is also claimable: either player can claim a draw after 50 moves by each side without a pawn move or capture.",
            fen: "4k3/8/8/8/8/8/8/4K3 w - - 0 1",
          },
          {
            caption:
              "Fivefold repetition is automatic, not claimable: if the same position occurs five times, the game automatically ends in a draw.",
            fen: "4k3/8/8/8/8/8/8/4K3 w - - 0 1",
          },
          {
            caption:
              "The 75-move rule is automatic too: if 75 moves by each side pass without a pawn move or capture, the game automatically ends in a draw, unless the final move checkmates.",
            fen: "4k3/8/8/8/8/8/8/4K3 w - - 0 1",
          },
          {
            caption:
              "One more automatic draw: a dead position - when no sequence of legal moves could ever lead to checkmate for either side. Insufficient material (like king and bishop vs. king alone) is the most common example, but any position where checkmate has become truly impossible counts.",
            fen: "4k3/8/8/8/8/8/8/4K3 w - - 0 1",
          },
        ],
        tryIt: {
          instructions: "Tap the black king - it has no legal moves here, but it's not in check. That's stalemate.",
          fen: "k7/8/1Q6/8/8/8/8/6K1 b - - 0 1",
          kind: "find",
          targetSquare: "a8",
          successMessage: "Right - no legal moves and not in check. That's a draw, not a loss.",
        },
        challenge: {
          instructions:
            "White to move, with a huge material lead. Trap the black king completely - no checks, no legal moves - for a draw by stalemate.",
          fen: "k7/8/8/1Q6/8/8/8/6K1 w - - 0 1",
          kind: "move",
          isGoalMove: (chess) => chess.isStalemate(),
          successMessage: "Careful play! Boxing in a lone king without ever checking it is a classic stalemate trap - always watch for this with a big material lead.",
          hint: "Think about where the queen can go that traps the king without giving check.",
        },
      },
    ],
  },
  {
    id: "basic-tactics",
    title: "Basic Tactics",
    description: "Fork, pin, and skewer: your first tactical weapons.",
    lessons: [
      {
        id: "fork",
        chapterId: "basic-tactics",
        title: "Fork",
        summary: "One piece attacks two enemies at once - and only one can be saved.",
        watch: [
          {
            caption: "A fork is when one piece attacks two enemy pieces at the same time - the opponent can only save one.",
            fen: "2r1k3/8/3N4/8/8/8/8/4K3 b - - 0 1",
            highlightSquares: ["d6", "e8", "c8"],
          },
          {
            caption: "Here, the knight attacks both the black king (check!) and the rook on c8. Black can only deal with one.",
            fen: "2r1k3/8/3N4/8/8/8/8/4K3 b - - 0 1",
          },
        ],
        tryIt: {
          instructions: "Move the knight to fork the black king and rook.",
          fen: "2r1k3/8/8/8/4N3/8/8/4K3 w - - 0 1",
          kind: "move",
          pieceSquare: "e4",
          successMessage: "That's a fork - one piece, two targets.",
        },
        challenge: {
          instructions: "White to move. Fork the king and rook with your knight.",
          fen: "2r1k3/8/8/8/4N3/8/8/4K3 w - - 0 1",
          kind: "move",
          isGoalMove: (_chess, move) => move.from === "e4" && move.to === "d6",
          successMessage: "Nd6+! That fork hits the king (check) and the rook - black can't save both.",
          hint: "Look for a square where your knight attacks both pieces at once.",
        },
      },
      {
        id: "pin",
        chapterId: "basic-tactics",
        title: "Pin",
        summary: "A piece lined up in front of something more valuable.",
        watch: [
          {
            caption:
              "A pin happens when a piece is lined up with a more valuable enemy piece behind it. Moving that piece can expose the more valuable piece to attack.",
            fen: "4k3/8/2n5/1B6/8/8/8/4K3 b - - 0 1",
            highlightSquares: ["b5", "c6", "e8"],
          },
          {
            caption: "If the knight moves, the king behind it is exposed to check - so for now, that knight can't move at all.",
            fen: "4k3/8/2n5/1B6/8/8/8/4K3 b - - 0 1",
          },
          {
            caption:
              "That's an absolute pin - moving the knight is illegal, because it would leave the king in check. But pins come in another form too: a relative pin, where the piece can legally move, but doing so loses something else valuable, like the queen.",
            fen: "4k3/8/2n5/1B6/8/8/8/4K3 b - - 0 1",
          },
        ],
        tryIt: {
          instructions: "Tap the piece that's pinned - it can't move without exposing its king.",
          fen: "4k3/8/2n5/1B6/8/8/8/4K3 b - - 0 1",
          kind: "find",
          targetSquare: "c6",
          successMessage: "Right - the knight on c6 is pinned to the king by the bishop on b5.",
        },
        challenge: {
          instructions: "White to move. The knight is pinned and undefended - win it.",
          fen: "4k3/8/2n5/1B6/3N4/8/8/4K3 w - - 0 1",
          kind: "move",
          isGoalMove: (_chess, move) => move.from === "d4" && move.to === "c6",
          successMessage: "Nxc6! The pin meant that knight could never escape or be defended by moving.",
          hint: "The black knight can't move without exposing its own king - it's defenseless.",
        },
      },
      {
        id: "skewer",
        chapterId: "basic-tactics",
        title: "Skewer",
        summary: "Attack the front piece, win the one lined up behind it.",
        watch: [
          {
            caption:
              "A skewer lines up two enemy pieces on the same line - attack the front one, and when it moves, you win the piece behind it.",
            fen: "q7/8/8/8/k7/7K/8/R7 b - - 0 1",
            highlightSquares: ["a1", "a4", "a8"],
          },
          {
            caption: "The king must move out of check - and once it does, the rook will capture the queen behind it.",
            fen: "q7/8/8/8/k7/7K/8/R7 b - - 0 1",
          },
        ],
        tryIt: {
          instructions: "Move the rook to skewer the king and queen on the a-file.",
          fen: "q7/8/8/8/k7/7K/8/5R2 w - - 0 1",
          kind: "move",
          pieceSquare: "f1",
          successMessage: "That lines up the king and queen on the same file - a skewer.",
        },
        challenge: {
          instructions: "White to move. Skewer the king and queen on the a-file.",
          fen: "q7/8/8/8/k7/7K/8/5R2 w - - 0 1",
          kind: "move",
          isGoalMove: (_chess, move) => move.from === "f1" && move.to === "a1",
          successMessage: "Ra1+! The king must move, and then your rook captures the queen behind it.",
          hint: "Line your rook up with both the king and queen on the same file.",
        },
      },
    ],
  },
];

export function findLesson(chapterId: string, lessonId: string) {
  const chapter = CHAPTERS.find((c) => c.id === chapterId);
  const lesson = chapter?.lessons.find((l) => l.id === lessonId);
  return lesson && chapter ? { chapter, lesson } : null;
}

export function allLessonsInOrder() {
  return CHAPTERS.flatMap((c) => c.lessons.map((l) => ({ chapterId: c.id, lessonId: l.id })));
}
