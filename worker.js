
const PIECE_BASE = 10;

onmessage = (e) => {
    function log(...parts) {
        for (let i = 0; i < parts.length; i++) {
            const p = parts[i];
            if (typeof p === "object") {
                parts[i] = JSON.stringify(p);
            }
        }

        postMessage({
            type: "log", msg: parts.join(" ")
        });
    }

    const { p, b } = e.data;

    const piecesId = Array.from(new Set(p.map((val) => val.id)));
    log("Pieces count:", piecesId.length, piecesId);
    log("Variants count:", p.length);

    let step_counter = 0;

    function step(used_ids) {
        if (used_ids.length === piecesId.length) {
            return true; // found solution
        }

        step_counter++;

        for (let i = 0; i < p.length; i++) {
            const piece = p[i];
            if (used_ids.includes(piece.id)) {
                continue;
            }

            // 1. attempt to place the piece.
            let placed_pos = null;
            grid_place_loop: for (let y = 0; y <= (b.h - piece.h); y++) {
                for (let x = 0; x <= (b.w - piece.w); x++) {
                    let can_place = true;
                    place_check: for (let px = 0; px < piece.w; px++) {
                        for (let py = 0; py < piece.h; py++) {
                            const px_board = px + x;
                            const py_board = py + y;
                            const board_value = b.data[px_board + py_board * b.w];
                            const piece_value = piece.data[px + py * piece.w];
                            if (piece_value !== 0 && board_value !== 0) {
                                can_place = false;
                                break place_check;
                            }
                        }
                    }

                    if (can_place) {
                        placed_pos = { x, y };
                        break grid_place_loop;
                    }
                }
            }

            // 2. continue the loop if placement failed.
            if (!placed_pos) {
                continue; // try with the next piece
            }

            // Write piece to board state
            for (let px = 0; px < piece.w; px++) {
                for (let py = 0; py < piece.h; py++) {
                    const px_board = px + placed_pos.x;
                    const py_board = py + placed_pos.y;
                    const board_value = b.data[px_board + py_board * b.w];

                    const piece_value = piece.data[px + py * piece.w];
                    if (piece_value) {
                        console.assert(board_value === 0);
                        b.data[px_board + py_board * b.w] = PIECE_BASE + piece.id;
                    }
                }
            }
            // 3. add piece id to used ids when placement succeeds.
            used_ids.push(piece.id);

            // 4. recusively try adding another piece by calling: step(used_ids).
            const ret = step(used_ids);

            // 5. if the function returns true, return true, if it returns false, 
            // remove the piece from the board, then continue the loop.
            if (ret) { return ret; }
            else {
                // Remove piece id from used ids.
                used_ids.splice(used_ids.indexOf(piece.id), 1);

                // Remove piece from board state
                for (let px = 0; px < piece.w; px++) {
                    for (let py = 0; py < piece.h; py++) {
                        const px_board = px + placed_pos.x;
                        const py_board = py + placed_pos.y;
                        const board_value = b.data[px_board + py_board * b.w];

                        const piece_value = piece.data[px + py * piece.w];
                        if (piece_value) {
                            console.assert(board_value === PIECE_BASE + piece.id);
                            b.data[px_board + py_board * b.w] = 0;
                        }
                    }
                }
            }
        }

        return false; // did not find solution, cannot proceed
    }

    const start = performance.now();
    const solved = step([]);
    const end = performance.now();

    const duration = Math.round(end - start);

    if (solved) {
        log("Success!");
        console.log("SUCCESS", step_counter);
    } else {
        log("Failed to solve.");
        console.error("Failed to solve.", step_counter);
    }
    log("Took", duration, "milliseconds.");
    log("Took", step_counter, "tries.");

    postMessage({ type: "result", b })
};