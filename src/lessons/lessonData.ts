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
