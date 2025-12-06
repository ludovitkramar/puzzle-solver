const PIECE_BASE = 10;

const grid_painter = document.querySelector("#grid_painter");
const create_grid = document.querySelector("#create-grid");
const grid_size_w = document.querySelector("#grid_size_w");
const grid_size_h = document.querySelector("#grid_size_h");
const save_grid = document.querySelector("#save_grid");
const load_grid = document.querySelector("#load_grid");

create_grid.onclick = initializeGrid;

function createGrid(parent, w_element, h_element, initial_data = undefined) {
    const w = initial_data?.w ?? Math.round(Number(w_element.value));
    const h = initial_data?.h ?? Math.round(Number(h_element.value));

    if (isNaN(w) || w <= 0) {
        throw new Error("invalid width.");
    }

    if (isNaN(h) || h <= 0) {
        throw new Error("invalid height.");
    }

    w_element.value = w;
    h_element.value = h;

    const grid_state = new Uint8Array(w * h);
    if (initial_data) {
        for (let i = 0; i < grid_state.length; i++) {
            grid_state[i] = initial_data.data[i];
        }
    }

    const get_state = (row, col) => {
        return grid_state[col + row * w];
    }

    const set_state = (row, col, value) => {
        grid_state[col + row * w] = value;
    }

    parent.replaceChildren();

    for (let i = 0; i < h; i++) {
        const row = document.createElement("div");
        row.classList.add("grid-row");
        row.dataset["row"] = i;

        for (let j = 0; j < w; j++) {
            const cell = document.createElement("div");
            cell.classList.add("grid-cell");
            cell.dataset["row"] = i;
            cell.dataset["col"] = j;
            cell.dataset.val = get_state(i, j);
            cell.textContent = get_state(i, j);

            row.appendChild(cell);
        }

        parent.appendChild(row);
    }

    parent.onclick = (e) => {
        const cell = e.target;
        const isCell = cell.classList.contains("grid-cell");
        if (!isCell) {
            console.warn("did not click on cell.");
            return;
        }

        const col = +cell.dataset.col;
        const row = +cell.dataset.row;

        const value = get_state(row, col);
        set_state(row, col, !value);

        const updated_state = get_state(row, col);
        cell.textContent = updated_state;
        cell.dataset.val = updated_state;
    }

    return {
        data: grid_state,
        w: w,
        h: h,
    }
}

let board;
function loadGrid() {
    let stored_board = localStorage.getItem("board");
    if (stored_board) {
        stored_board = JSON.parse(stored_board);
    }

    board = createGrid(grid_painter, grid_size_w, grid_size_h, stored_board);
}

loadGrid();
load_grid.onclick = loadGrid;

function initializeGrid() {
    board = createGrid(grid_painter, grid_size_w, grid_size_h);
}

save_grid.onclick = () => {
    for (let i = 0; i < board.data.length; i++) {
        if (board.data[i] !== 1) {
            board.data[i] = 0;
        }
    }
    const data = Array.from(board.data);
    localStorage.setItem("board", JSON.stringify({ ...board, data }));
}

const shape_size_w = document.getElementById("shape_size_w");
const shape_size_h = document.getElementById("shape_size_h");
const shape_painter = document.getElementById("shape_painter");
const new_shape = document.getElementById("new_shape");
const clear_shapes = document.getElementById("clear_shapes");
const save_shape = document.getElementById("save_shape");
const all_shapes = document.getElementById("all_shapes");

/**
 * @type {{w: number, h: number, data: Uint8Array}[]}
 */
const shapes = [];

let working_shape_editor;
new_shape.onclick = () => {
    if (shapes.length >= 256) {
        alert("Maximum number of shapes (256) reached.");
        return;
    }
    working_shape_editor = createGrid(shape_painter, shape_size_w, shape_size_h);
}

save_shape.onclick = () => {
    if (!working_shape_editor) {
        alert("Cannot save, no active shape editor.");
        return;
    }

    shapes.push(working_shape_editor);
    working_shape_editor = null;
    shape_painter.replaceChildren();
    console.log({ shapes });

    const all_shapes_and_variants = update_all_shapes_preview();
    localStorage.setItem("shapes", JSON.stringify(shapes));
    console.log("Saved shapes to local storage.", { all_shapes_and_variants });
}

const stored_shapes = localStorage.getItem("shapes");
if (stored_shapes) {
    const stored_arr = JSON.parse(stored_shapes);
    for (const s of stored_arr) {
        const data = new Uint8Array(s.w * s.h);
        for (let i = 0; i < data.length; i++) {
            data[i] = s.data[i];
        }
        s.data = data;
        shapes.push(s);
    }

    const all_shapes_and_variants = update_all_shapes_preview();
    console.log("Loaded shapes from local storage.", { all_shapes_and_variants });
}

clear_shapes.onclick = () => {
    shapes.length = 0;
    localStorage.removeItem("shapes");
    update_all_shapes_preview();
}

function rotate_shape_90deg(shape) {
    const w = shape.h;
    const h = shape.w;
    const data = new Uint8Array(w * h);

    for (let col = 0; col < shape.w; col++) {
        for (let row = 0; row < shape.h; row++) {
            const new_i = row;
            const new_j = h - 1 - col;
            const value = shape.data[col + row * shape.w];
            data[new_i + new_j * w] = value;
        }
    }

    return { w, h, data, id: shape.id }
}

function mirror_horizontal_shape(shape) {
    const data = new Uint8Array(shape.w * shape.h);

    for (let j = 0; j < shape.h; j++) {
        for (let i = 0; i < shape.w; i++) {
            const new_i = shape.w - i - 1;
            const value = shape.data[i + j * shape.w];
            data[new_i + j * shape.w] = value;
        }
    }

    return { w: shape.w, h: shape.h, data, id: shape.id };
}

/**
 * Compare if two shapes are the same.
 * @param {*} a 
 * @param {*} b 
 * @returns {boolean} Returns false when they are different.
 */
function compare(a, b) {
    if (a.w !== b.w || a.h !== b.h) {
        return false;
    }

    for (let i = 0; i < a.data.length; i++) {
        const aValue = a.data[i];
        const bValue = b.data[i];

        if (aValue !== bValue) {
            return false;
        }
    }

    return true;
}

function deduplicate(shapes) {
    const deduplicated = [];
    for (let i = 0; i < shapes.length; i++) {
        const current = shapes[i];
        if (!current) {
            continue;
        }

        deduplicated.push(current);

        for (let j = i + 1; j < shapes.length; j++) {
            const other = shapes[j];
            if (!other) {
                continue;
            }

            const isSame = compare(current, other);
            if (isSame) {
                shapes[j] = null;
            }
        }
    }

    return deduplicated;
}

function update_all_shapes_preview() {
    all_shapes.replaceChildren();

    function create_preview(shape) {
        const preview = document.createElement("div");
        preview.classList.add("preview-container");

        for (let i = 0; i < shape.h; i++) {
            const row = document.createElement("div");
            row.classList.add("preview-row");
            for (let j = 0; j < shape.w; j++) {
                const cell = document.createElement("div");
                cell.classList.add("preview-cell");
                cell.dataset.active = !!shape.data[j + i * shape.w];
                row.appendChild(cell);
            }
            preview.appendChild(row);
        }

        return preview;
    }

    const all_shapes_and_variants = [];

    for (let k = 0; k < shapes.length; k++) {
        const shape = shapes[k];
        shape.id = k;
        const variants = [shape];

        let rotated = shape;
        for (let i = 0; i < 3; i++) {
            rotated = rotate_shape_90deg(rotated);
            variants.push(rotated);
        }

        let mirror = mirror_horizontal_shape(shape);
        variants.push(mirror);

        for (let i = 0; i < 3; i++) {
            mirror = rotate_shape_90deg(mirror);
            variants.push(mirror);
        }

        // Create DOM elements for the preview.
        const deduplicated = deduplicate(variants);
        const shape_previews = document.createElement("div");
        shape_previews.classList.add("shape-previews");

        const up_button = document.createElement("button");
        up_button.textContent = "Up";
        const down_button = document.createElement("button");
        down_button.textContent = "Down";
        shape_previews.appendChild(up_button);
        shape_previews.appendChild(down_button);

        function swap_and_save(index, other) {
            const temp = shapes[other];
            shapes[other] = shapes[index];
            shapes[index] = temp;

            localStorage.setItem("shapes", JSON.stringify(shapes));
            console.log("Saved shapes to local storage.");
            update_all_shapes_preview();
        }

        up_button.onclick = () => { swap_and_save(k, k - 1); }
        down_button.onclick = () => { swap_and_save(k, k + 1); }

        if (k === 0) {
            up_button.disabled = true;
        }

        if (k === shapes.length - 1) {
            down_button.disabled = true;
        }

        for (const variant of deduplicated) {
            shape_previews.appendChild(create_preview(variant));
        }
        all_shapes.appendChild(shape_previews);

        all_shapes_and_variants.push(...deduplicated);
    }

    return all_shapes_and_variants;
}

const find_first = document.getElementById("find_first");
const solve_log = document.getElementById("solve_log");

const worker = new Worker("./worker.js");

function display_solve_result(b) {
    function get_neighbors(id) {
        const ret = new Set();
        for (let row = 0; row < b.h; row++) {
            for (let col = 0; col < b.w; col++) {
                const value = b.data[col + row * b.w];
                if (value === id) {
                    // left
                    if (col > 0) {
                        ret.add(b.data[col - 1 + row * b.w]);
                    }

                    // right
                    if (col < b.w - 1) {
                        ret.add(b.data[col + 1 + row * b.w]);
                    }

                    // top
                    if (row > 0) {
                        ret.add(b.data[col + (row - 1) * b.w]);
                    }

                    // bottom
                    if (row < b.h - 1) {
                        ret.add(b.data[col + (row + 1) * b.w]);
                    }
                }
            }
        }


        ret.delete(id);
        ret.delete(0);
        ret.delete(1);

        return ret;
    }

    const colors = ["#009E73", "#D55E01", "#0072B2", "#F0E442"];
    const used_colors = {};

    const cells = grid_painter.querySelectorAll(".grid-cell");
    for (const cell of cells) {
        const r = +cell.dataset.row;
        const c = +cell.dataset.col;
        const id = b.data[c + r * b.w];
        if (!used_colors[id]) {
            const neighbours = get_neighbors(id);
            const available_colors = [...colors];
            for (const n of neighbours) {
                if (used_colors[n]) {
                    const index = available_colors.indexOf(used_colors[n]);
                    if (index >= 0) {
                        available_colors.splice(index, 1);
                    }
                }
            }

            // NOTE: This greedy color filler cannot guarantee that all neighbours use only three colours.
            // console.assert(available_colors.length >= 1);

            // pick the least used color
            const color_counter = {};
            for (const color of Object.values(used_colors)) {
                if (!color_counter[color]) {
                    color_counter[color] = 0;
                }
                color_counter[color]++;
            }

            available_colors.sort((a, b) => {
                return (color_counter[a] || 0) - (color_counter[b] || 0)
            });

            used_colors[id] = available_colors[0] || "salmon";
        }

        const color = used_colors[id];

        if (id >= PIECE_BASE) {
            cell.style.backgroundColor = color;
            cell.textContent = id;
            cell.dataset.val = id;
        }
    }
}

find_first.onclick = () => {
    document.body.style.pointerEvents = "none";

    worker.onmessage = (ev) => {
        switch (ev.data.type) {
            case "log":
                solve_log.textContent += ev.data.msg + "\n";
                break;

            case "result":
                document.body.style.pointerEvents = "auto";
                display_solve_result(ev.data.b);
                break;

            default:
                console.error("Unknown data type.");
                break;
        }
    }

    solve_log.replaceChildren();

    const b = board;
    // reset board
    for (let i = 0; i < b.data.length; i++) {
        if (b.data[i] !== 1) {
            b.data[i] = 0;
        }
    }

    const p = update_all_shapes_preview();

    worker.postMessage({ p, b });
}


window.print_board = () => {
    let table = "";
    for (let row = 0; row < board.h; row++) {
        let line = "";
        for (let col = 0; col < board.w; col++) {
            const value = board.data[col + row * board.w];
            line += "[" + String(value).padStart("2", "0") + "]";
        }
        table += line;
        table += "\n"
    }
    console.log(table);
}