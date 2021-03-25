/*todo: 
 * solve tool: change to solve mode?
 *      hover over cells to highlight that cell's ring.  
 *      click on colors to toggle those rings on/off.  
 *      hide ring when it fulfills the clue: either correct number of shaded cells or (for 0 clues) all cells marked unshaded.
 * fix solve starbattle to use shaded/unshaded and not numbers.
 * What do I really want?  Set a puzzle to find out.  
 * Solve starbattle.
 * 
*/

'use strict';
$(document).ready(function () {

    class Cell {
        hexTypeID = 0;
        number = 0;
        sudokuCellGroups = [];
        x = 0;
        y = 0;
        constructor(x, y, hexTypeID, number, sudokuCellGroups) {
            this.x = x;
            this.y = y;
            this.hexTypeID = hexTypeID;
            this.number = number;
            this.sudokuCellGroups = sudokuCellGroups;
        }
    }
    function getCellClone(cell) {
        return new Cell(cell.x, cell.y, cell.hexTypeID, cell.number, cell.sudokuCellGroups);
    }

    function getDrawCoords(x, y, overX) {
        if (typeof overX == "undefined") overX = x;
        var drawY = HEX_H * y + canvasDrawingYOff;
        var drawX = HEX_W * x + canvasDrawingXOff;
        if (overX % 2) {
            drawY += HEX_H / 2;
        }
        return [drawX, drawY];
    };

    function getHexCenter(x, y) {
        var drawCoords = getDrawCoords(x, y);
        return [drawCoords[0] + HEX_W * .65, drawCoords[1] + HEX_H / 2];
    };

    function setPathCoords(x, y, percent) {
        if (percent == undefined) percent = 1;
        ctx.beginPath();
        for (var i = 0; i < 6; i++) {
            ctx.lineTo(x + HEX_PATH[i][0] * percent, y + HEX_PATH[i][1] * percent); // no need to moveTo first, since the initial lineTo is treated as a moveTo.
        }
        ctx.closePath();
    };
    function setPath(x, y) {
        var drawCoords = getDrawCoords(x, y);
        setPathCoords(drawCoords[0], drawCoords[1]);
    };

    function drawBlock(x, y, fillStyle, offsetX, offsetY, stroke) {
        // draw a single hex at (x, y)
        if (x < 0 || y < 0) return;
        if (offsetX === undefined) offsetX = 0;
        if (offsetY === undefined) offsetY = 0;
        var drawCoords = getDrawCoords(x, y);
        drawBlockCoords(drawCoords[0] + offsetX, drawCoords[1] + offsetY, fillStyle, stroke);

        return drawCoords;
    };
    function drawBlockCoords(x, y, fillStyle, stroke) {
        setPathCoords(x, y);
        if (fillStyle) {
            ctx.fillStyle = fillStyle;
            ctx.fill();
        }
        if (stroke) {
            ctx.stroke();
        }
    }

    function resetBoard() {
        board = [];
        for (var x = 0; x < COLS; ++x) {
            board[x] = [];
            for (var y = 0; y < ROWS; ++y) {
                setBoardHexType([x, y], 0);
            }
        }
        //todo: draw a starting hex, centered on ROWS/2,COLS/2.
        var centerColX = Math.floor(COLS / 2);

        let coordsWest = [centerColX, 0];
        let coordsEast = [centerColX, 0];
        for (var xOff = 0; xOff <= centerColX; ++xOff) {
            let lineLen = coordsWest[0] + centerColX + 1;
            for (var yOff = 0; yOff < lineLen; ++yOff) {
                setBoardHexType([coordsWest[0], coordsWest[1] + yOff], 1);
                setBoardHexType([coordsEast[0], coordsEast[1] + yOff], 1);
            }
            coordsWest = getNeighborHexCoords(coordsWest, 4);//4 for southwest;
            coordsEast = getNeighborHexCoords(coordsEast, 0);//4 for southeast;
        }
        //for (let lineheight = ROWS; lineheight > centerColX - 1; lineheight--) {
        //    //move left and right, drawing down.
        //    for (var y = 0; y < ROWS; ++y) {
        //        setBoardHexType([centerColX, y], 1);
        //    }
        //}

        description = "Untitled";
        $("#hTitle").text(description);
        undoboards = [];
        redoboards = [];
        resetBoardDisplay();

    }
    function resetBoardDisplay() {
        boardDisplay = [];
        for (var x = 0; x < COLS; ++x) {
            boardDisplay[x] = [];
            for (var y = 0; y < ROWS; ++y) {
                boardDisplay[x][y] = "";
            }
        }
    }

    function importBoard() {
        //let boardDef = $("#txtBoardDefinition").val();
        //window.localStorage.setItem("boardDef", boardDef);
        boardDef = boardDef.split("~");
        COLS = JSON.parse(boardDef.shift()) * 2 - 1;
        ROWS = COLS;
        resetBoard();
        description = boardDef.shift();
        $("#hTitle").text(description);
        thermos = JSON.parse(boardDef.shift());
        var lines = boardDef[0].replace(/\./g, "@").split(";");
        //for each line, get the first 4 characters, convert to integer, put it in board.
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].split("");
            for (var j = 0; j < line.length; j++) {
                if (inBoard(j, i)) {
                    var lineVal = line[j];
                    if (Number.isInteger(Number(lineVal))) {
                        setBoardNumber([j, i], Number(lineVal));
                        line.splice(j, 1);
                        j--;
                    } else {
                        var boardvalue = lineVal.charCodeAt(0) - 64;
                        setBoardHexType([j, i], boardvalue);
                    }
                }
            }
        }
        recalcDrawingOffsets();
        drawBoard();
    }
    function drawBoard() {

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        //clear out mouseovers that were here before.
        for (var i = mouseOverTexts.length - 1; i >= 0; i--) {
            if (mouseOverTexts[i].type != "tool") {
                mouseOverTexts.splice(i, 1);
            }
        }

        let drawStrings = [];
        var filledBlocks = [];
        var minX = COLS;
        var minY = ROWS;
        var maxX = 0;
        var maxY = 0;
        for (var x = 0; x < board.length; ++x) {
            for (var y = 0; y < board[x].length; ++y) {
                var hexTypeID = board[x][y].hexTypeID;
                if (hexTypeID > 0) {
                    filledBlocks.push([x, y]);
                    if (minX > x) {
                        minX = x;
                    }
                    if (maxX < x) {
                        maxX = x;
                    }
                    if (minY > y) {
                        minY = y;
                    }
                    if (maxY < y) {
                        maxY = y;
                    }
                    //} else {
                    //drawBlock(x, y, hexTypes[hexTypeID].color, null, null, true);
                    //todo: make this a basic hex, not squarish grid
                }
            }
        }

        // stroke the filled blocks with a shadow.
        ctx.shadowBlur = 3;
        ctx.lineWidth = 3;
        for (var i = 0; i < filledBlocks.length; i++) {
            var x = filledBlocks[i][0];
            var y = filledBlocks[i][1];

            //draw block shadow, preparing for real block next.
            drawBlock(x, y, null, null, null, true);
        }
        ctx.shadowBlur = 0;

        if (filledBlocks.length > 0) {

            for (var i = 0; i < filledBlocks.length; i++) {
                var x = filledBlocks[i][0];
                var y = filledBlocks[i][1];
                var cell = board[x][y];
                var hexTypeID = cell.hexTypeID;
                var hexType = hexTypes[hexTypeID];

                var coords = drawBlock(x, y, hexType.color);
                var displayValue = "";
                if (cell.number) {
                    if (cell.number == 7) {
                        displayValue = " 0";
                    } else {
                        displayValue = " " + cell.number.toString();
                    }
                    if (boardDisplay[x][y]) {
                        displayValue += ": " + boardDisplay[x][y];
                    }
                } else {
                    displayValue = boardDisplay[x][y];
                }

                drawStrings.push([displayValue.substr(0, 3), Math.round(coords[0]) + 10, Math.round(coords[1] + 6), "black"]);

                //addMouseOverText(hexType.name + " (" + x + "," + y + "): " + boardDisplay[x][y], "board", coords[0] + 6, coords[1] + 3, coords[0] + 5 + 16, coords[1] + 3 + 16);
                //draw bounding box:
                //ctx.shadowBlur = 0; ctx.lineWidth = 1; ctx.strokeRect(coords[0] + 5, coords[1] + 3, 16, 16);

            }
        }
        //reset drawing context
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'black';

        for (var thermo of thermos) {
            //draw bulb
            var thermocoords = thermo[0];
            var [drawX, drawY] = getHexCenter(thermocoords[0], thermocoords[1]);
            ctx.fillStyle = "rgba(150,150,150,100)";
            ctx.beginPath();
            ctx.arc(drawX, drawY, HEX_H / 3, 0, 2 * Math.PI);
            ctx.fill();

            ctx.strokeStyle = "rgba(150,150,150,100)";
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.moveTo(drawX, drawY);
            for (let tidx = 1; tidx < thermo.length; tidx++) {
                let nextthermocoords = thermo[tidx];
                //draw a line from prev to next.
                [drawX, drawY] = getHexCenter(nextthermocoords[0], nextthermocoords[1]);
                ctx.lineTo(drawX, drawY);
                thermocoords = nextthermocoords;

            }
            ctx.stroke();
        }

        //draw rings
        ctx.globalAlpha = .5
        for (let hexTypeID = 0; hexTypeID < hexTypes.length; hexTypeID++) {
            let hexType = hexTypes[hexTypeID];
            if (hexType.radius) {
                //get all cells of that radius and draw rings around them.
                for (var x = 0; x < COLS; ++x) {
                    for (var y = 0; y < ROWS; ++y) {
                        var cell = getBoardCell([x, y]);
                        if (cell && cell.hexTypeID == hexTypeID) {

                            ctx.strokeStyle = hexType.color;

                            ctx.lineWidth = 8;
                            ctx.beginPath();

                            for (let dir = 0; dir < 8; dir++) {
                                let ringCoords = [cell.x, cell.y];
                                for (let radiusI = 0; radiusI < hexType.radius; radiusI++) {
                                    ringCoords = getNeighborHexCoords(ringCoords, dir % 6);
                                }
                                let [drawX, drawY] = getHexCenter(ringCoords[0], ringCoords[1]);
                                ctx.lineTo(drawX, drawY);
                            }
                            ctx.stroke();
                        }
                    }
                }
            }
        }
        ctx.lineWidth = 1;
        ctx.globalAlpha = 1;
        ctx.strokeStyle = 'black';
        for (let [s, x, y, c] of drawStrings) {
            drawString(s, x, y, c);
        }

        drawToolbox();

    }

    function getBoardDef() {
        //display board text further down in the webpage.
        var lines = [];
        var boardWidth = 0;
        var boardHeight = 0;
        for (let y = 0; y < board[0].length; ++y) {
            var line = "";
            var lineBuffer = "";
            for (let x = 0; x < board.length; ++x) {
                var hexTypeID = board[x][y].hexTypeID;
                var boardValue = String.fromCharCode(64 + hexTypeID);
                if (hexTypeID > 0) {
                    var number = board[x][y].number;
                    if (number > 0) {
                        lineBuffer += number.toString();
                    }
                }
                lineBuffer += boardValue;
                if (hexTypeID > 0) {
                    if (x > boardWidth) {
                        boardWidth = x;
                    }
                    if (y > boardHeight) {
                        boardHeight = y;
                    }
                    line += lineBuffer;
                    lineBuffer = "";
                }
            }
            lines.push(line || "@");
        }
        lines.length = boardHeight + 1;

        var boardDef = Math.ceil(COLS / 2) + "~" + description + "~" + JSON.stringify(thermos) + "~" + lines.join(";").replace(/@/g, ".");
        return boardDef;

        //$("#txtBoardDefinition").val(boardDef);
        //window.localStorage.setItem("boardDef", boardDef);
    }

    function drawToolbox() {
        for (var i = 0; i < tools.length; i++) {
            var tool = tools[i];
            if (tool.color != "") {
                ctx.fillStyle = tool.color;
                ctx.fillRect(tool.x, tool.y, tool.width, tool.height);
                ctx.strokeStyle = "black";
                ctx.strokeRect(tool.x, tool.y, tool.width, tool.height);
            }
            if (typeof tool.draw === "string") {
                drawString(tool.draw, tool.x + tool.width / 2 - 6.5, tool.y + 3.5, "black");
            } else if (tool.draw) {
                tool.draw();
            }
        }
    }

    function drawToolShadow(tool) {
        //draw shadow and re-fill.
        ctx.shadowBlur = 3;
        ctx.lineWidth = 3;
        ctx.strokeRect(tool.x, tool.y, tool.width, tool.height);
        ctx.fillRect(tool.x, tool.y, tool.width, tool.height);
        ctx.shadowBlur = 0;
        ctx.lineWidth = 1;
    }

    function getToolAtCoords(mouseX, mouseY) {
        for (var i = 0; i < tools.length; i++) {
            var tool = tools[i];
            if (tool.x <= mouseX && mouseX <= tool.x + tool.width && tool.y <= mouseY && mouseY <= tool.y + tool.height) {
                return tool;
            }
        }
    }
    function addMouseOverText(text, type, left, top, right, bottom) {
        mouseOverTexts.push({
            text: text,
            type: type,
            left: left,
            top: top,
            right: right,
            bottom: bottom,
        });
    }
    function getMouseOverTextAtCoords(mouseX, mouseY) {
        for (var i = mouseOverTexts.length - 1; i >= 0; i--) {
            var mouseOverText = mouseOverTexts[i];
            if (mouseOverText.left <= mouseX && mouseX <= mouseOverText.right && mouseOverText.top <= mouseY && mouseY <= mouseOverText.bottom) {
                if (typeof mouseOverText.text == "string") {
                    return mouseOverText.text;
                } else {
                    return mouseOverText.text();
                }
            }
        }
    }
    var isMouseDown = false;
    var mouseMovingColor = 0;
    var showingMouseOver = false;
    function handleMouse(e, eventType) {
        e.preventDefault();
        e.stopPropagation();

        var canvasOffset = $canvas.offset();
        var offsetX = canvasOffset.left;
        var offsetY = canvasOffset.top;
        var mouseX = parseInt(e.clientX - offsetX);
        var mouseY = parseInt(e.clientY - offsetY);
        if (eventType == "move") {
            if (currentTool == "Pencil") {
                var prevHexCoords = getMouseHexCoords(prevMouseX, prevMouseY);
                var hexCoords = getMouseHexCoords(mouseX, mouseY);
                if (prevHexCoords[0] != hexCoords[0] || prevHexCoords[1] != hexCoords[1]) {
                    usePencil(mouseX, mouseY, e.shiftKey, e.ctrlKey);
                }
            }
            if (showingMouseOver) {
                showingMouseOver = false;
                drawBoard();
            }
            var mouseOverText = getMouseOverTextAtCoords(mouseX, mouseY);
            if (mouseOverText) {
                drawString(mouseOverText, mouseX, mouseY + 20, "black", "white");
                showingMouseOver = true;
            }
        } else if (eventType == "down") {
            var handled = false;
            //check tools first
            var tool = getToolAtCoords(mouseX, mouseY);
            if (tool) {
                handled = true;
                tool.click(e.ctrlKey, e.shiftKey);
            }
            if (!handled) {
                //check board
                isMouseDown = true;
                if (currentTool == "Thermo") {
                    var hexCoords = getMouseHexCoords(mouseX, mouseY);
                    if (inBoard(hexCoords[0], hexCoords[1])) {
                        let cell = getBoardCell(hexCoords);
                        if (cell) {
                            registerBoardChange();
                            //check if this is in a thermo.  if so, remove this cell and all above it.
                            //todo: clean up thermos which are contained within other thermos, to handle case when we just trimmed off a split portion.
                            let foundit = false;
                            for (let tidx = thermos.length - 1; tidx >= 0; tidx--) {
                                for (let tidx2 = 0; tidx2 < thermos[tidx].length; tidx2++) {
                                    var thermocellcoords = thermos[tidx][tidx2]
                                    if (thermocellcoords[0] == cell.x && thermocellcoords[1] == cell.y) {
                                        foundit = true;
                                        if (tidx2 == 0) {
                                            thermos.splice(tidx, 1);
                                        } else {
                                            thermos[tidx].splice(tidx2, thermos[tidx].length - tidx2);
                                        }
                                        break;
                                    }
                                }
                                if (foundit) break;
                            }
                            if (!foundit) {
                                //if not, check if adjacent cells are in any thermos.  if so, add to the nearest thermo cell.
                                let closestAdjacentThermo = null;
                                let closestAdjacentThermoCellID = null;
                                let closestAdjacentThermoDist = 1000000;
                                for (let neighborcell of getAllNeighborHexCoords(hexCoords)) {
                                    //check all thermos to see if they exist.
                                    foundit = false;
                                    for (let thermo of thermos) {
                                        //for (let thermocell of thermo) {
                                        for (let tidx = 0; tidx < thermo.length; tidx++) {
                                            if (neighborcell[0] == thermo[tidx][0] && neighborcell[1] == thermo[tidx][1]) {
                                                let neighborcenter = getHexCenter(neighborcell[0], neighborcell[1]);
                                                let dist = Math.pow(mouseX - neighborcenter[0], 2) + Math.pow(mouseY - neighborcenter[1], 2);
                                                if (dist < closestAdjacentThermoDist) {
                                                    closestAdjacentThermo = thermo;
                                                    closestAdjacentThermoCellID = tidx;
                                                    closestAdjacentThermoDist = dist;
                                                }
                                                foundit = true;
                                                break;
                                            }
                                        }
                                        if (foundit) break;
                                    }
                                }
                                if (closestAdjacentThermo) {
                                    //put cell onto end of existing thermo.
                                    if (closestAdjacentThermoCellID == closestAdjacentThermo.length - 1) {
                                        closestAdjacentThermo.push([cell.x, cell.y]);
                                    } else {
                                        //create new thermo split from last, with this cell as last one.
                                        let newthermo = [];
                                        for (let tidx = 0; tidx <= closestAdjacentThermoCellID; tidx++) {
                                            newthermo.push([closestAdjacentThermo[tidx][0], closestAdjacentThermo[tidx][1]]);
                                        }
                                        newthermo.push([cell.x, cell.y]);
                                        thermos.push(newthermo);
                                    }
                                } else {
                                    //start new thermo.
                                    thermos.push([[cell.x, cell.y]]);
                                }
                            }
                            drawBoard();
                        }
                    }
                } else if (currentTool == "Pencil") {
                    var boardJSON = getBoardJSON();
                    mouseMovingColor = 0;
                    if (usePencil(mouseX, mouseY, e.shiftKey, e.ctrlKey)) {
                        registerBoardChange(boardJSON);
                    }
                }
            }
        } else if (eventType == "up") {
            isMouseDown = false;
            mouseMovingColor = 0;
            prevMouseX = null;
            prevMouseY = null;
        }
    }
    function getBoardJSON() {
        return JSON.stringify({ "desc": description, "board": board, "thermos": thermos });
    }
    function registerBoardChange(boardJSON) {
        undoboards.push(boardJSON || getBoardJSON());
        redoboards = [];
    }
    function undoBoardChange(numTimes) {
        numTimes = numTimes || 1;
        if (undoboards.length > 0 && undoboards.length < numTimes) {
            numTimes = undoboards.length;
        }
        if (undoboards.length >= numTimes) {
            redoboards.push(getBoardJSON());
            for (var i = 0; i < numTimes - 1; i++) {
                redoboards.push(undoboards.pop());
            }
            doBoardChange(undoboards.pop());
        }
    }

    function redoBoardChange(numTimes) {
        numTimes = numTimes || 1;
        if (redoboards.length > 0 && redoboards.length < numTimes) {
            numTimes = redoboards.length;
        }

        if (redoboards.length) {
            undoboards.push(getBoardJSON());
            for (var i = 0; i < numTimes - 1; i++) {
                undoboards.push(redoboards.pop());
            }
            doBoardChange(redoboards.pop());
        }
    }
    function doBoardChange(boardJSON) {
        var b = JSON.parse(boardJSON);
        board = b.board;
        description = b.desc;
        $("#hTitle").text(description);
        thermos = b.thermos;
        resetBoardDisplay();
    }

    var prevMouseX = null;
    var prevMouseY = null;
    function usePencil(mouseX, mouseY, shiftKey, ctrlKey) {
        var changed = false;
        if (isMouseDown) {
            var hexTypeID = currentHexType;
            if (shiftKey) {
                hexTypeID = 0;
            } else if (currentHexType == -1) {
                //solve tool: get current hex to determine proper action.

                var hexCoords = getMouseHexCoords(mouseX, mouseY);
                if (inBoard(hexCoords[0], hexCoords[1])) {
                    let targetHexTypeID = board[hexCoords[0]][hexCoords[1]].hexTypeID;

                    if (targetHexTypeID > 3) {
                        //found a clue, increase the ring size.
                        var maxRadius = Math.floor(COLS / 2);
                        if (event.buttons == 2) {
                            if (hexTypes[targetHexTypeID].radius > 0) {
                                hexTypes[targetHexTypeID].radius--;
                            } else {
                                hexTypes[targetHexTypeID].radius = maxRadius;
                            }
                        } else {
                            if (hexTypes[targetHexTypeID].radius < maxRadius) {
                                hexTypes[targetHexTypeID].radius++;
                            } else {
                                hexTypes[targetHexTypeID].radius = 0;
                            }
                        }
                        drawBoard();
                        hexTypeID = 0;
                    } else {
                        if (mouseMovingColor == 0) {
                            if (targetHexTypeID == 1) {
                                if (event.buttons == 2) {
                                    //None, set to Shaded
                                    hexTypeID = 3;
                                } else {
                                    //None, set to Unshaded
                                    hexTypeID = 2;
                                }
                            } else if (targetHexTypeID == 2) {
                                if (event.buttons == 2) {
                                    //Unshaded, set to None
                                    hexTypeID = 1;
                                } else {
                                    //Unshaded, set to Shaded
                                    hexTypeID = 3;
                                }
                            } else if (targetHexTypeID == 3) {
                                if (event.buttons == 2) {
                                    //Shaded, set to Unshaded
                                    hexTypeID = 2;
                                } else {
                                    //Shaded, set to None
                                    hexTypeID = 1;
                                }
                            }
                        } else {
                            hexTypeID = mouseMovingColor;
                        }
                    }
                } else {
                    hexTypeID = 0;
                }
            }
            if (hexTypeID != 0) {
                mouseMovingColor = hexTypeID;
                //move from mouseX, mouseY toward prevMouseX, prevMouseY, filling in as we go.  Every X pixels, where X is based on hex diameter
                var stepCount = 1;
                if (prevMouseX != null && prevMouseY != null) {
                    //get distance between points.  divide by hex diameter, and this gives us the number of steps to use.
                    var dist = Math.sqrt((mouseX - prevMouseX) * (mouseX - prevMouseX) + (mouseY - prevMouseY) * (mouseY - prevMouseY));
                    stepCount = Math.ceil(dist / linelen);
                } else {
                    prevMouseX = mouseX;
                    prevMouseY = mouseY;
                }
                //for each step, calculate a point by mixing the new mouse location with the old location by a percentage, based on the step number.
                for (var i = 0; i < stepCount; i++) {
                    var pct = i / stepCount;
                    var hexCoords = getMouseHexCoords(prevMouseX * pct + mouseX * (1 - pct), prevMouseY * pct + mouseY * (1 - pct));
                    var x = hexCoords[0];
                    var y = hexCoords[1];
                    if (x >= 0 && y >= 0) {
                        //only allow changing number, not creating new cell
                        let cell = getBoardCell([x, y]);
                        if (cell && cell.hexTypeID > 0) {

                            var hexType = hexTypes[hexTypeID];
                            if (hexType.color == "Plum") {//the numbers.
                                setBoardNumber([x, y], (hexType.symbol == "0" ? 7 : Number(hexType.symbol)))
                            }
                            else {
                                //toggle colors on/off if it's the same clue color.
                                if (cell.hexTypeID == hexTypeID && hexTypeID > 3) {
                                    hexTypeID = 1;
                                }
                                setBoardHexType([x, y], hexTypeID);
                            }
                            changed = true;
                        }
                    }
                }
                drawBoard();

                prevMouseX = mouseX;
                prevMouseY = mouseY;
            }
        }
        return changed;
    }

    var HexDirections = [
        {
            "name": "SOUTHEAST",
            "symbol": "↘",
        },
        {
            "name": "NORTHEAST",
            "symbol": "↗",
        },
        {
            "name": "NORTH",
            "symbol": "↑",
        },
        {
            "name": "NORTHWEST",
            "symbol": "↖",
        },
        {
            "name": "SOUTHWEST",
            "symbol": "↙",
        },
        {
            "name": "SOUTH",
            "symbol": "↓",
        },
    ];
    var neighborDirections = [
        [[+1, 0], [+1, -1], [0, -1], [-1, -1], [-1, 0], [0, +1]],
        [[+1, +1], [+1, 0], [0, -1], [-1, 0], [-1, +1], [0, +1]],
    ]
    function getNeighborHexCoords(hexCoords, direction) {
        var parity = hexCoords[0] & 1;
        var dir = neighborDirections[parity][direction];
        return [hexCoords[0] + dir[0], hexCoords[1] + dir[1]];
    }
    function getAllNeighborHexCoords(hexCoords) {
        var neighborHexCoords = [];
        for (var i = 0; i < 6; i++) {
            neighborHexCoords.push(getNeighborHexCoords(hexCoords, i));
        }
        return neighborHexCoords;
    }
    function inBoard(x, y) {
        let inboard = !(typeof board[x] == 'undefined' || typeof board[x][y] == 'undefined');
        return inboard;
    }

    function dedupeArray(ar) {
        var j = {};

        ar.forEach(function (v) {
            j[v + '::' + typeof v] = v;
        });

        return Object.keys(j).map(function (v) {
            return j[v];
        });
    }
    //function solveBoardWithGuesses() {
    //    var log;
    //    $.ajax({
    //        async: false,
    //        url: '/?handler=SolveWithGuesses',
    //        type: 'POST',
    //        headers: {
    //            RequestVerificationToken:
    //                $('input:hidden[name="__RequestVerificationToken"]').val()
    //        },
    //        data: {
    //            boardJSON: JSON.stringify(board),
    //            boardDisplayJSON: JSON.stringify(boardDisplay),
    //            description: description
    //        },
    //        success: function (result) {
    //            registerBoardChange();
    //            board = result.item2;
    //            boardDisplay = result.item3;
    //            undoboards = undoboards.concat(result.item4);
    //            log = result.item1;
    //        },
    //        error: function (result) {
    //            alert(result);
    //        }
    //    });
    //    return log;
    //}
    function setStarBattleCellGroups(starCount) {
        setSudokuCellGroups(true);
        for (var x = 0; x < COLS; ++x) {
            for (var y = 0; y < ROWS; ++y) {
                var cell = getBoardCell([x, y]);
                if (cell) {
                    for (let group of cell.sudokuCellGroups) {
                        group.totalValue = starCount;
                    }
                    //except just 1 for the adjacent cells.
                    cell.sudokuCellGroups[0].totalValue = 1;
                }
            }
        }
    }
    function makeSudokuCellGroup(totalValue, cellCoords) {
        return { totalValue: totalValue, cellCoords: cellCoords };
    }
    function setSudokuCellGroups() {
        for (var x = 0; x < COLS; ++x) {
            for (var y = 0; y < ROWS; ++y) {
                var cell = getBoardCell([x, y]);
                if (cell) {
                    cell.sudokuCellGroups = [];

                    for (var i = 0; i < 3; i++) {
                        var axisCoords = [];
                        //for each direction
                        for (var i2 = 0; i2 < 4; i2 += 3) {
                            var x2 = x;
                            var y2 = y;
                            //travel to the edge of the board, cataloging cells on the way.
                            while (true) {
                                let neighborcoords = getNeighborHexCoords([x2, y2], i + i2);
                                x2 = neighborcoords[0];
                                y2 = neighborcoords[1];
                                if (!inBoard(x2, y2)) {
                                    break;
                                }
                                if (getBoardCell([x2, y2])) {
                                    axisCoords.push([x2, y2]);
                                } else {
                                    //stop looking when passing empty cells.  Remove this to allow gaps within a line while retaining the set.
                                    break;
                                }
                            }
                        }
                        cell.sudokuCellGroups.push(makeSudokuCellGroup(0, axisCoords));
                    }
                }
            }
        }
    }
    function getNumStarsInGroup(flatBoard, coordsList) {
        let seenStars = 0;
        for (let coords of coordsList) {
            if (flatBoard[coords[0]][coords[1]].hexTypeID == 3) {
                seenStars++;
            }
        }
        return seenStars;
    }

    function getMouseHexCoords(mouseX, mouseY) {
        //todo: limit the seach space if time is a factor
        for (var x = 0; x < board.length; ++x) {
            for (var y = 0; y < board[x].length; ++y) {
                setPath(x, y);
                if (ctx.isPointInPath(mouseX, mouseY)) {
                    return [x, y];
                }
            }
        }
        return [-1, -1];
    };
    function getBoardCell(hexCoords) {
        if (inBoard(hexCoords[0], hexCoords[1])) {
            return board[hexCoords[0]][hexCoords[1]];
        } else {
            return undefined;
        }
    };
    function setBoardHexType(hexCoords, hexTypeID) {
        var cell = board[hexCoords[0]][hexCoords[1]];
        if (typeof cell != 'undefined') {
            cell.hexTypeID = hexTypeID;
        } else {
            board[hexCoords[0]][hexCoords[1]] = new Cell(hexCoords[0], hexCoords[1], hexTypeID, 0);
        }
    };
    function setBoardNumber(hexCoords, number) {
        var cell = board[hexCoords[0]][hexCoords[1]];
        if (cell.number == number) {
            cell.number = 0;
        } else {
            cell.number = number;
        }
    };

    function getBoardCopy() {
        var boardCopy = [];
        for (var x = 0; x < COLS; ++x) {
            boardCopy[x] = [];
            for (var y = 0; y < ROWS; ++y) {
                var cell = board[x][y];
                boardCopy[x][y] = getCellClone(cell);
            }
        }
        return boardCopy;
    };

    function drawString(s, inX, inY, color, backgroundColor, maxWidth) {
        ctx.fillStyle = "black";
        ctx.fillText(s, inX, inY + 18, maxWidth);
        return;
        //var pixels = [];
        //var x = inX;
        //var y = inY;
        //for (var i = 0; i < s.length; i++) {
        //    var charObj = pixelChars[s[i].charCodeAt(0)];
        //    if (!charObj) {
        //        charObj = pixelChars["�".charCodeAt(0)];
        //    }

        //    if (maxWidth && x + charObj.width + 1 > inX + maxWidth - 2) {
        //        x = inX;
        //        y += 12;
        //    }
        //    x -= charObj.xOffset;

        //    var px = 3;
        //    var py = 0;
        //    for (var pi = 0; pi < charObj.pixels.length; pi++) {
        //        if (charObj.pixels[pi]) {
        //            pixels.push([x + px, y + py]);
        //        }
        //        if (px == 3 && py == 0) {
        //            px = 0;
        //            py++;
        //        } else if (px == 6 && py == 7) {
        //            py += 1;
        //            px = 3;
        //        } else if (px == 6) {
        //            px = 0;
        //            py++;
        //        } else {
        //            px++;
        //        }
        //    }
        //    x += charObj.xOffset + charObj.width + 1;
        //}

        //var stringLength = maxWidth ? maxWidth : x - inX;
        //var xOffset = 0;
        //if (inX + stringLength + 1 > canvasW) {
        //    xOffset = inX - (canvasW - stringLength - 1);
        //    inX = canvasW - stringLength - 1;
        //}
        //if (backgroundColor) {
        //    ctx.fillStyle = backgroundColor;
        //    ctx.fillRect(inX - 1.5, inY - 1.5, stringLength + 2, 12);
        //    ctx.strokeStyle = "black";
        //    ctx.strokeRect(inX - 1.5, inY - 1.5, stringLength + 2, 12);
        //}
        //ctx.fillStyle = color;
        //for (var i = 0; i < pixels.length; i++) {
        //    ctx.fillRect(pixels[i][0] - xOffset, pixels[i][1], 1, 1);
        //}
    }

    var pixelChars = {};
    function pushToPixels(key, stringValue) {
        var arr = [];
        for (var i = 0; i < stringValue.length; i++) {
            arr.push(stringValue[i] != " ");
        }
        //determine the rightmost and leftmost pixels.  Assume that the middle pixel is filled.
        var leftmostOffset = undefined;
        var rightmostOffset = undefined;
        if (key == " ") {
            leftmostOffset = 2;
            rightmostOffset = 4;
        } else {
            for (var j = 0; j < 3; j++) {
                for (var j2 = 1; j2 < 47; j2 += 7) {
                    if (arr[j2 + j]) {
                        leftmostOffset = j;
                        break;
                    }
                }
                if (leftmostOffset != undefined) {
                    break;
                }
            }
            if (leftmostOffset == undefined) {
                leftmostOffset = 3;
            }

            for (var j = 0; j < 3; j++) {
                for (var j2 = 7; j2 < 50; j2 += 7) {
                    if (arr[j2 - j]) {
                        rightmostOffset = 6 - j;
                        break;
                    }
                }
                if (rightmostOffset != undefined) {
                    break;
                }
            }
            if (rightmostOffset == undefined) {
                rightmostOffset = 3;
            }


        }

        pixelChars[key.charCodeAt(0)] = {
            "pixels": arr,
            "width": rightmostOffset - leftmostOffset + 1,
            "xOffset": leftmostOffset,
        };
    }

    var keys = {
        //arrow keys
        37: 'left', //left arrow
        38: 'up', //up arrow
        39: 'right', //right arrow
        40: 'down', //down arrow
        16: 'rotateCCW', //shift
        //38: 'rotateCW', //up arrow
        17: 'swapaction', //ctrl

        //numpad
        100: 'left', //numpad 4
        102: 'right', //numpad 6
        101: 'down', //numpad 5
        103: 'rotateCCW', //numpad 7
        104: 'rotateCW', //numpad 8
        96: 'swapaction', //numpad 0

        //letters
        65: 'a',
        66: 'b',
        67: 'c',
        68: 'd',
        69: 'e',
        70: 'f',
        71: 'g',
        72: 'h',
        73: 'i',
        74: 'j',
        75: 'k',
        76: 'l',
        77: 'm',
        78: 'n',
        75: 'o',
        80: 'p',
        81: 'q',
        82: 'r',
        83: 's',
        84: 't',
        85: 'u',
        86: 'v',
        87: 'w',
        88: 'x',
        89: 'y',
        90: 'z',

        46: 'delete',

        //number keys, used for cheats
        48: 'key_0', //0
        49: 'key_1', //1
        50: 'key_2', //2
        51: 'key_3', //3
        52: 'key_4', //4
        53: 'key_5', //5
        54: 'key_6', //6
        55: 'key_7', //7
        56: 'key_8', //8
        57: 'key_9', //9

        //Other:
        27: 'pause', //Esc
        192: '`',
    };
    document.body.onkeydown = function (e) {
        var handled = false;
        var keyname = keys[e.keyCode];
        if (typeof keyname != 'undefined') {
            keyname = (e.ctrlKey ? "^" : "") + (e.shiftKey ? "+" : "") + keyname;
            $.each(tools, function (idx, tool) {
                if (keyname == tool.shortcutKey) {
                    tool.click(e.ctrlKey, e.shiftKey);
                    handled = true;
                }
            });
            if (!handled) {
                //else if (keyname == 'left') {
                //    if (currentHexType > 1) {
                //        currentHexType--;
                //    }
                //    drawBoard();
                //}
                //else if (keyname == 'right') {
                //    if (currentHexType < 7) {
                //        currentHexType++;
                //    }
                //    drawBoard();
                //}
            }
        }
        if (!handled) {
            if (e.key == 'z' && e.ctrlKey) {
                //undo
                undoBoardChange();
                drawBoard();

            } else if (e.key == 'Z' && e.ctrlKey) {
                //super undo
                undoBoardChange(10);
                drawBoard();

            } else if (e.key == 'y' && e.ctrlKey) {
                //redo
                redoBoardChange();
                drawBoard();
            } else if (e.key == 'Y' && e.ctrlKey) {
                //super redo
                redoBoardChange(10);
                drawBoard();
            } else if (e.key == 'Y' && e.ctrlKey) {
                //super redo
                redoBoardChange(10);
                drawBoard();
            }
        }
    };

    var canvas = document.getElementById('canvas');
    var canvasW = canvas.width;
    var canvasH = canvas.height;
    var linelen = 20;//6;//20;//
    var HEX_W = linelen * 1.5;
    var HEX_H = linelen * 2 / 1.1547;
    var HEX_PATH = [
        [linelen * 1.5, HEX_H],
        [linelen * 2.0, HEX_H / 2],
        [linelen * 1.5, 0],
        [linelen * 0.5, 0],
        [0, HEX_H / 2],
        [linelen * 0.5, HEX_H],
    ];
    var canvasDrawingXOff = 0;
    var canvasDrawingYOff = 0;
    function recalcDrawingOffsets() {
        canvasDrawingXOff = 0;
        canvasDrawingYOff = 0;
        var drawCoords = getDrawCoords(ROWS, COLS);
        canvasDrawingXOff = canvasW / 2 - drawCoords[0] / 2;
        canvasDrawingYOff = canvasH / 2 - drawCoords[1] / 2;
    }

    var COLS = 13;//19;//
    var ROWS = 13;//13;//19;// //N rows, plus creating a V at the bottom.  with COLS = 11, this means 5 extra rows.
    var board;
    var boardDisplay;
    var undoboards;//used for undo
    var redoboards;//used for redo
    var thermos = [];

    var description;

    var ctx = canvas.getContext('2d');
    ctx.shadowColor = 'black';
    ctx.font = '20px sans-serif';

    var $canvas = $(canvas);

    $canvas.mousemove(function (e) { handleMouse(e, "move"); });
    $canvas.mousedown(function (e) { handleMouse(e, "down"); });
    $canvas.mouseup(function (e) { handleMouse(e, "up"); });

    var boardHalfW = COLS * HEX_W / 2 + HEX_H - HEX_W;
    var boardHalfH = ROWS * HEX_H;
    var transparencyGradient = ctx.createRadialGradient(boardHalfW, boardHalfH, 0, boardHalfW, boardHalfH, Math.sqrt((boardHalfW * boardHalfW) + (boardHalfH * boardHalfH)));
    var n = 0;
    while (n < ROWS * 2) {
        transparencyGradient.addColorStop(n / (ROWS * 2), n % 2 == 1 ? '#eee' : '#ccc');
        n++;
    }
    var hexTypeNames = {
        "None": "None",
        "Unshaded": "Unshaded",
        "Shaded": "Shaded",
        "Red": "Red",
        "Orange": "Orange",
        "Yellow": "Yellow",
        "Green": "Lime",
        "DarkGreen": "Green",
        "Blue": "Blue",
        "Purple": "Purple",
        "Zero": "0",
        "One": "1",
        "Two": "2",
        "Three": "3",
        "Four": "4",
        "Five": "5",
        "Six": "6",
    };
    var hexTypes = [
        {
            name: hexTypeNames.None,
            color: transparencyGradient,
            symbol: "",
        }, {
            name: hexTypeNames.None,
            color: "white",
            symbol: "",
        }, {
            name: hexTypeNames.Unshaded,
            color: "burlywood",
            symbol: "",
        }, {
            name: hexTypeNames.Shaded,
            color: "saddlebrown",
            symbol: "",//"#",
        }, {
            name: hexTypeNames.Red,
            color: "crimson",
            symbol: "",//"➕",
            radius: 0,
        }, {
            name: hexTypeNames.Orange,
            color: "orange",
            symbol: "",//"➕",
            radius: 0,
        }, {
            name: hexTypeNames.Yellow,
            color: "gold",
            symbol: "",//"☇",
            radius: 0,
        }, {
            name: hexTypeNames.Green,
            color: "lawngreen",
            symbol: "",//"☆",
            radius: 0,
        }, {
            name: hexTypeNames.DarkGreen,
            color: "Green",
            symbol: "",//"★",
            radius: 0,
        }, {
            name: hexTypeNames.Blue,
            color: "dodgerblue",
            symbol: "",//"⛨",
            radius: 0,
        }, {
            name: hexTypeNames.Purple,
            color: "Purple",
            symbol: "",//"★",
            radius: 0,
        },
        {
            name: hexTypeNames.Zero,
            color: "Plum",
            symbol: "0",
            shortcutKey: 'key_0',
        },
        {
            name: hexTypeNames.One,
            color: "Plum",
            symbol: "1",
            shortcutKey: 'key_1',
        },
        {
            name: hexTypeNames.Two,
            color: "Plum",
            symbol: "2",
            shortcutKey: 'key_2',
        },
        {
            name: hexTypeNames.Three,
            color: "Plum",
            symbol: "3",
            shortcutKey: 'key_3',
        },
        {
            name: hexTypeNames.Four,
            color: "Plum",
            symbol: "4",
            shortcutKey: 'key_4',
        },
        {
            name: hexTypeNames.Five,
            color: "Plum",
            symbol: "5",
            shortcutKey: 'key_5',
        },
        {
            name: hexTypeNames.Six,
            color: "Plum",
            symbol: "6",
            shortcutKey: 'key_6',
        },
    ];
    var hexTypeMap = {};
    for (var i = 0; i < hexTypes.length; i++) {
        var hexType = hexTypes[i];
        hexTypeMap[hexType.name] = i;
    };
    (function addPixelChars() {
        pushToPixels("A", "Q" +
            " QQ QQ " +
            "Q     Q" +
            "Q     Q" +
            "Q  Q  Q" +
            "QQQ QQQ" +
            "Q     Q" +
            "Q     Q" +
            " ");
        pushToPixels("B", "Q" +
            "QQQ QQ " +
            "Q     Q" +
            "Q  Q  Q" +
            "QQQ QQ " +
            "Q     Q" +
            "Q     Q" +
            "QQQ QQ " +
            "Q");
        pushToPixels("C", "Q" +
            " QQ QQ " +
            "Q     Q" +
            "Q      " +
            "Q      " +
            "Q      " +
            "Q     Q" +
            " QQ QQ " +
            "Q");
        pushToPixels("D", "Q" +
            "QQQ QQ " +
            "Q     Q" +
            "Q     Q" +
            "Q     Q" +
            "Q     Q" +
            "Q     Q" +
            "QQQ QQ " +
            "Q");
        pushToPixels("E", "Q" +
            "QQQ QQ " +
            "Q     Q" +
            "Q  Q   " +
            "QQQ Q  " +
            "Q      " +
            "Q     Q" +
            "QQQ QQ " +
            "Q");
        pushToPixels("F", "Q" +
            "QQQ QQ " +
            "Q     Q" +
            "Q      " +
            "Q  Q   " +
            "QQQ QQ " +
            "Q      " +
            "Q      " +
            " ");
        pushToPixels("G", "Q" +
            " QQ QQ " +
            "Q     Q" +
            "Q      " +
            "Q   QQ " +
            "Q  Q  Q" +
            "Q     Q" +
            " QQ QQ " +
            "Q");
        pushToPixels("H", " " +
            "Q     Q" +
            "Q     Q" +
            "Q  Q  Q" +
            "QQQ QQQ" +
            "Q     Q" +
            "Q     Q" +
            "Q     Q" +
            " ");
        pushToPixels("I", "Q" +
            " QQQQQ " +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            " QQQQQ " +
            "Q");
        pushToPixels("J", " " +
            "    QQQ" +
            "      Q" +
            "      Q" +
            "      Q" +
            "      Q" +
            "      Q" +
            " QQ QQ " +
            "Q");
        pushToPixels("K", " " +
            "Q     Q" +
            "Q     Q" +
            "Q   QQ " +
            "Q  Q   " +
            "QQQ QQ " +
            "Q     Q" +
            "Q     Q" +
            " ");
        pushToPixels("L", " " +
            "Q      " +
            "Q      " +
            "Q      " +
            "Q      " +
            "Q      " +
            "Q      " +
            "QQQ QQQ" +
            "Q");
        pushToPixels("M", " " +
            "Q     Q" +
            "QQQ QQQ" +
            "Q  Q  Q" +
            "Q  Q  Q" +
            "Q     Q" +
            "Q     Q" +
            "Q     Q" +
            " ");
        pushToPixels("N", " " +
            "Q     Q" +
            "QQQ   Q" +
            "Q  Q  Q" +
            "Q  Q  Q" +
            "Q  Q  Q" +
            "Q   QQQ" +
            "Q     Q" +
            " ");
        pushToPixels("O", "Q" +
            " QQ QQ " +
            "Q     Q" +
            "Q     Q" +
            "Q     Q" +
            "Q     Q" +
            "Q     Q" +
            " QQ QQ " +
            "Q");
        pushToPixels("P", "Q" +
            "QQQ QQ " +
            "Q     Q" +
            "Q     Q" +
            "Q     Q" +
            "QQQ QQ " +
            "Q  Q   " +
            "Q      " +
            " ");
        pushToPixels("Q", "Q" +
            " QQ QQ " +
            "Q     Q" +
            "Q     Q" +
            "Q  Q  Q" +
            "Q   QQQ" +
            "Q     Q" +
            " QQ QQQ" +
            "Q");
        pushToPixels("R", "Q" +
            "QQQ QQ " +
            "Q     Q" +
            "Q     Q" +
            "Q  Q  Q" +
            "QQQ QQ " +
            "Q     Q" +
            "Q     Q" +
            " ");
        pushToPixels("S", "Q" +
            " QQ QQ " +
            "Q     Q" +
            "Q  Q   " +
            " QQ QQ " +
            "      Q" +
            "Q     Q" +
            " QQ QQ " +
            "Q");
        pushToPixels("T", "Q" +
            " QQQQQ " +
            "Q  Q  Q" +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            "Q");
        pushToPixels("U", " " +
            "Q     Q" +
            "Q     Q" +
            "Q     Q" +
            "Q     Q" +
            "Q     Q" +
            "Q     Q" +
            " QQ QQ " +
            "Q");
        pushToPixels("V", " " +
            "Q     Q" +
            "Q     Q" +
            "Q     Q" +
            "Q     Q" +
            " Q   Q " +
            "  Q Q  " +
            "  Q Q  " +
            "Q");
        pushToPixels("W", " " +
            "Q     Q" +
            "Q     Q" +
            "Q     Q" +
            "Q     Q" +
            "Q  Q  Q" +
            "Q  Q  Q" +
            " QQ QQ " +
            " ");
        pushToPixels("X", " " +
            "Q     Q" +
            "Q     Q" +
            " QQ QQ " +
            "   Q   " +
            " QQ QQ " +
            "Q     Q" +
            "Q     Q" +
            " ");
        pushToPixels("Y", " " +
            "Q     Q" +
            "Q     Q" +
            "Q     Q" +
            " QQ QQ " +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            "Q");
        pushToPixels("Z", "Q" +
            "QQQ QQQ" +
            "      Q" +
            "    QQ " +
            "   Q   " +
            " QQ    " +
            "Q      " +
            "QQQ QQQ" +
            "Q");
        pushToPixels("a", "Q" +
            " QQ QQ " +
            "Q     Q" +
            "   Q  Q" +
            " QQ QQQ" +
            "Q     Q" +
            "Q     Q" +
            " QQ QQQ" +
            "Q");
        pushToPixels("b", " " +
            "Q      " +
            "Q      " +
            "Q  Q   " +
            "QQQ QQ " +
            "Q     Q" +
            "Q     Q" +
            "QQQ QQ " +
            "Q");
        pushToPixels("c", " " +
            "       " +
            "   Q   " +
            " QQ QQ " +
            "Q      " +
            "Q      " +
            "Q     Q" +
            " QQ QQ " +
            "Q");
        pushToPixels("d", " " +
            "      Q" +
            "      Q" +
            "   Q  Q" +
            " QQ QQQ" +
            "Q     Q" +
            "Q     Q" +
            " QQ QQQ" +
            "Q");
        pushToPixels("e", " " +
            "       " +
            "   Q   " +
            " QQ QQ " +
            "Q  Q  Q" +
            "QQQ QQ " +
            "Q      " +
            " QQ QQQ" +
            "Q");
        pushToPixels("f", " " +
            "   Q   " +
            "  Q QQ " +
            " Q     " +
            " Q Q   " +
            " QQ QQ " +
            " Q     " +
            " Q     " +
            " ");
        pushToPixels("g", " " +
            "   Q   " +
            " QQ QQ " +
            "Q     Q" +
            " QQ QQQ" +
            "   Q  Q" +
            "Q     Q" +
            " QQ QQ " +
            "Q");
        pushToPixels("h", " " +
            " Q     " +
            " Q     " +
            " Q Q   " +
            " QQ QQ " +
            " Q   Q " +
            " Q   Q " +
            " Q   Q " +
            " ");
        pushToPixels("i", " " +
            "   Q   " +
            "       " +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            "Q");
        pushToPixels("j", " " +
            "    Q  " +
            "       " +
            "    Q  " +
            "    Q  " +
            "    Q  " +
            "    Q  " +
            "  Q Q  " +
            "Q");
        pushToPixels("k", " " +
            " Q     " +
            " Q  Q  " +
            " Q  Q  " +
            " Q Q   " +
            " QQ QQ " +
            " Q   Q " +
            " Q   Q " +
            " ");
        pushToPixels("l", " " +
            "  Q    " +
            "  Q    " +
            "  Q    " +
            "  Q    " +
            "  Q    " +
            "  Q    " +
            "  Q Q  " +
            "Q");
        pushToPixels("m", " " +
            "       " +
            "       " +
            "QQQ QQ " +
            "Q  Q  Q" +
            "Q  Q  Q" +
            "Q     Q" +
            "Q     Q" +
            " ");
        pushToPixels("n", " " +
            "       " +
            "       " +
            "Q  Q   " +
            "QQQ QQ " +
            "Q     Q" +
            "Q     Q" +
            "Q     Q" +
            " ");
        pushToPixels("o", " " +
            "       " +
            "   Q   " +
            " QQ QQ " +
            "Q     Q" +
            "Q     Q" +
            "Q     Q" +
            " QQ QQ " +
            "Q");
        pushToPixels("p", " " +
            "   Q   " +
            " QQ QQ " +
            "Q     Q" +
            "Q     Q" +
            "QQQ QQ " +
            "Q  Q   " +
            "Q      " +
            " ");
        pushToPixels("q", " " +
            "   Q   " +
            " QQ QQ " +
            "Q     Q" +
            "Q     Q" +
            " QQ QQQ" +
            "   Q  Q" +
            "      Q" +
            " ");
        pushToPixels("r", " " +
            "       " +
            "       " +
            " Q Q   " +
            " QQ QQ " +
            " Q     " +
            " Q     " +
            " Q     " +
            " ");
        pushToPixels("s", " " +
            "       " +
            "   Q   " +
            " QQ QQ " +
            "Q  Q  Q" +
            " QQ QQ " +
            "      Q" +
            "QQQ QQ " +
            "Q");
        pushToPixels("t", "Q" +
            "   Q   " +
            "   Q   " +
            " QQQQQ " +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            "Q");
        pushToPixels("u", " " +
            "       " +
            "       " +
            "Q     Q" +
            "Q     Q" +
            "Q     Q" +
            "Q     Q" +
            " QQ QQQ" +
            "Q");
        pushToPixels("v", " " +
            "       " +
            "       " +
            "Q     Q" +
            "Q     Q" +
            " Q   Q " +
            "  Q Q  " +
            "  Q Q  " +
            "Q");
        pushToPixels("w", " " +
            "       " +
            "       " +
            "Q     Q" +
            "Q     Q" +
            "Q  Q  Q" +
            "Q  Q  Q" +
            " QQ QQ " +
            " ");
        pushToPixels("x", " " +
            "       " +
            "       " +
            "Q     Q" +
            " QQ QQ " +
            "   Q   " +
            " QQ QQ " +
            "Q     Q" +
            " ");
        pushToPixels("y", " " +
            "       " +
            "       " +
            "Q     Q" +
            "Q     Q" +
            " QQ QQ " +
            "   Q   " +
            "   Q   " +
            "Q");
        pushToPixels("z", " " +
            "       " +
            "   Q   " +
            "QQQ QQQ" +
            "   Q  Q" +
            " QQ QQ " +
            "Q      " +
            "QQQ QQQ" +
            "Q");
        pushToPixels("1", "Q" +
            "  QQ   " +
            " Q Q   " +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            " QQQQQ " +
            "Q");
        pushToPixels("2", "Q" +
            " QQ QQ " +
            "Q     Q" +
            "      Q" +
            "    QQ " +
            " QQQ   " +
            "Q     Q" +
            "QQQ QQQ" +
            "Q");
        pushToPixels("3", "Q" +
            " QQ QQ " +
            "Q     Q" +
            "      Q" +
            "   QQQ " +
            "      Q" +
            "Q     Q" +
            " QQ QQ " +
            "Q");
        pushToPixels("4", " " +
            " Q    Q" +
            "Q     Q" +
            "Q     Q" +
            "QQQ QQQ" +
            "   Q  Q" +
            "      Q" +
            "      Q" +
            " ");
        pushToPixels("5", "Q" +
            "QQQ QQQ" +
            "Q     Q" +
            "Q  Q   " +
            "QQQ QQ " +
            "      Q" +
            "Q     Q" +
            " QQ QQ " +
            "Q");
        pushToPixels("6", "Q" +
            " QQ QQ " +
            "Q     Q" +
            "Q  Q   " +
            "QQQ QQ " +
            "Q     Q" +
            "Q     Q" +
            " QQ QQ " +
            "Q");
        pushToPixels("7", "Q" +
            "QQQ QQQ" +
            "Q     Q" +
            "      Q" +
            "    QQ " +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            "Q");
        pushToPixels("8", "Q" +
            " QQ QQ " +
            "Q     Q" +
            "Q  Q  Q" +
            " QQ QQ " +
            "Q     Q" +
            "Q     Q" +
            " QQ QQ " +
            "Q");
        pushToPixels("9", "Q" +
            " QQ QQ " +
            "Q     Q" +
            "Q     Q" +
            " QQ QQQ" +
            "   Q  Q" +
            "Q     Q" +
            " QQ QQ " +
            "Q");
        pushToPixels("0", "Q" +
            " QQ QQ " +
            "Q    QQ" +
            "Q   Q Q" +
            "Q  Q  Q" +
            "Q Q   Q" +
            "QQ    Q" +
            " QQ QQ " +
            "Q");
        pushToPixels(":", " " +
            "       " +
            "       " +
            "   Q   " +
            "       " +
            "       " +
            "   Q   " +
            "       " +
            " ");
        pushToPixels("-", " " +
            "       " +
            "       " +
            "       " +
            " QQQQQ " +
            "       " +
            "       " +
            "       " +
            " ");
        pushToPixels(",", " " +
            "       " +
            "       " +
            "       " +
            "       " +
            "       " +
            "    Q  " +
            "    Q  " +
            "Q");
        pushToPixels("'", " " +
            "    Q  " +
            "    Q  " +
            "   Q   " +
            "       " +
            "       " +
            "       " +
            "       " +
            " ");
        pushToPixels(";", " " +
            "       " +
            "       " +
            "    Q  " +
            "       " +
            "       " +
            "    Q  " +
            "    Q  " +
            "Q");
        pushToPixels(".", " " +
            "       " +
            "       " +
            "       " +
            "       " +
            "       " +
            "       " +
            "   Q   " +
            " ");
        pushToPixels("?", "Q" +
            " QQ QQ " +
            "Q     Q" +
            "Q     Q" +
            "    QQ " +
            "   Q   " +
            "       " +
            "   Q   " +
            " ");
        pushToPixels("!", "Q" +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            "       " +
            "       " +
            "Q");
        pushToPixels("/", " " +
            "     Q " +
            "     Q " +
            "    Q  " +
            "   Q   " +
            "  Q    " +
            " Q     " +
            " Q     " +
            " ");
        pushToPixels("\\", " " +
            " Q     " +
            " Q     " +
            "  Q    " +
            "   Q   " +
            "    Q  " +
            "     Q " +
            "     Q " +
            " ");
        pushToPixels("�", "Q" +
            "  QQQ  " +
            " Q   Q " +
            "Q QQQ Q" +
            "QQQQ QQ" +
            "QQQ QQQ" +
            " QQQQQ " +
            "  Q Q  " +
            "Q");

        pushToPixels("↥", "Q" +
            "  Q Q  " +
            " Q   Q " +
            "QQQ QQQ" +
            "  Q Q  " +
            "  Q Q  " +
            "  Q Q  " +
            "QQQ QQQ" +
            " ");
        pushToPixels("↧", " " +
            "QQQ QQQ" +
            "  Q Q  " +
            "  Q Q  " +
            "  Q Q  " +
            "QQQ QQQ" +
            " Q   Q " +
            "  Q Q  " +
            "Q");
        pushToPixels("↑", "Q" +
            "  QQQ  " +
            " QQQQQ " +
            "QQQQQQQ" +
            "  QQQ  " +
            "  QQQ  " +
            "  QQQ  " +
            "  Q Q  " +
            " ");
        pushToPixels("↓", " " +
            "  Q Q  " +
            "  QQQ  " +
            "  QQQ  " +
            "  QQQ  " +
            "QQQQQQQ" +
            " QQQQQ " +
            "  QQQ  " +
            "Q");
        pushToPixels("↖", " " +
            "QQQQQ  " +
            "QQQQ   " +
            "QQQQ   " +
            "QQQQQ  " +
            "Q  QQQ " +
            "    QQQ" +
            "     Q " +
            " ");
        pushToPixels("↗", " " +
            "  QQQQQ" +
            "   QQQQ" +
            "   QQQQ" +
            "  QQQQQ" +
            " QQQ  Q" +
            "QQQ    " +
            " Q     " +
            " ");
        pushToPixels("↘", " " +
            " Q     " +
            "QQQ    " +
            " QQQ  Q" +
            "  QQQQQ" +
            "   QQQQ" +
            "   QQQQ" +
            "  QQQQQ" +
            " ");
        pushToPixels("↙", " " +
            "     Q " +
            "    QQQ" +
            "Q  QQQ " +
            "QQQQQ  " +
            "QQQQ   " +
            "QQQQ   " +
            "QQQQQ  " +
            " ");
        pushToPixels("@", "Q" +
            " QQ QQ " +
            "Q  Q  Q" +
            "Q Q Q Q" +
            "Q Q  QQ" +
            "Q Q  Q " +
            "Q  QQ  " +
            " QQ QQQ" +
            "Q");
        pushToPixels("*", "Q" +
            "Q  Q  Q" +
            " Q Q Q " +
            "   Q   " +
            "QQQQQQQ" +
            "   Q   " +
            " Q Q Q " +
            "Q  Q  Q" +
            "Q");
        pushToPixels("#", " " +
            " Q   Q " +
            "QQQQQQQ" +
            " Q   Q " +
            " Q   Q " +
            " Q   Q " +
            "QQQQQQQ" +
            " Q   Q " +
            " ");
        pushToPixels("+", " " +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            "QQQQQQQ" +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            " ");
        pushToPixels("$", "Q" +
            " QQQQQ " +
            "Q  Q  Q" +
            "Q  Q   " +
            " QQQQQ " +
            "   Q  Q" +
            "Q  Q  Q" +
            " QQQQQ " +
            "Q");
        pushToPixels("&", "Q" +
            "  Q Q  " +
            " Q  Q  " +
            "  QQ   " +
            " Q QQ Q" +
            "Q   Q Q" +
            "Q   QQ " +
            " QQQ QQ" +
            " ");
        pushToPixels("%", " " +
            "     Q " +
            " Q   Q " +
            "    Q  " +
            "   Q   " +
            "  Q    " +
            " Q   Q " +
            " Q     " +
            " ");
        pushToPixels("^", " " +
            "   Q   " +
            "  Q Q  " +
            " Q   Q " +
            "       " +
            "       " +
            "       " +
            "       " +
            " ");
        pushToPixels("(", "Q" +
            "  Q    " +
            "  Q    " +
            " Q     " +
            " Q     " +
            " Q     " +
            "  Q    " +
            "  Q    " +
            "Q");
        pushToPixels(")", "Q" +
            "    Q  " +
            "    Q  " +
            "     Q " +
            "     Q " +
            "     Q " +
            "    Q  " +
            "    Q  " +
            "Q");
        pushToPixels("_", " " +
            "       " +
            "       " +
            "       " +
            "       " +
            "       " +
            "       " +
            "QQQQQQQ" +
            " ");
        pushToPixels("=", " " +
            "       " +
            "       " +
            " QQQQQ " +
            "       " +
            " QQQQQ " +
            "       " +
            "       " +
            " ");
        pushToPixels("`", " " +
            " QQ    " +
            "   Q   " +
            "       " +
            "       " +
            "       " +
            "       " +
            "       " +
            " ");
        pushToPixels("~", " " +
            "       " +
            "       " +
            "  QQ  Q" +
            " Q  QQ " +
            "       " +
            "       " +
            "       " +
            " ");
        pushToPixels("[", " " +
            " QQQ   " +
            " Q     " +
            " Q     " +
            " Q     " +
            " Q     " +
            " Q     " +
            " QQQ   " +
            " ");
        pushToPixels("]", " " +
            "   QQQ " +
            "     Q " +
            "     Q " +
            "     Q " +
            "     Q " +
            "     Q " +
            "   QQQ " +
            " ");
        pushToPixels("{", "Q" +
            "  Q    " +
            "  Q    " +
            "  Q    " +
            " Q     " +
            "  Q    " +
            "  Q    " +
            "  Q    " +
            "Q");
        pushToPixels("}", "Q" +
            "    Q  " +
            "    Q  " +
            "    Q  " +
            "     Q " +
            "    Q  " +
            "    Q  " +
            "    Q  " +
            "Q");
        pushToPixels("|", "Q" +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            "   Q   " +
            "Q");
        pushToPixels("\"", " " +
            " Q  Q  " +
            " Q  Q  " +
            " Q  Q  " +
            "       " +
            "       " +
            "       " +
            "       " +
            " ");
        pushToPixels(">", " " +
            "       " +
            " QQ    " +
            "   QQ  " +
            "     Q " +
            "   QQ  " +
            " QQ    " +
            "       " +
            " ");
        pushToPixels("<", " " +
            "       " +
            "    QQ " +
            "  QQ   " +
            " Q     " +
            "  QQ   " +
            "    QQ " +
            "       " +
            " ");
        pushToPixels("⚫", " " +
            "       " +
            "  QQQ  " +
            " QQQQQ " +
            " QQQQQ " +
            " QQQQQ " +
            "  QQQ  " +
            "       " +
            " ");
        pushToPixels(hexTypes[hexTypeMap[hexTypeNames.Green]].symbol, "Q" +
            "  Q Q  " +
            "QQQ QQQ" +
            "Q     Q" +
            " Q   Q " +
            " Q Q Q " +
            "Q Q Q Q" +
            "QQ   QQ" +
            " ");
        pushToPixels(hexTypes[hexTypeMap[hexTypeNames.DarkGreen]].symbol, "Q" +
            "  QQQ  " +
            "QQQQQQQ" +
            "QQQQQQQ" +
            " QQQQQ " +
            " QQQQQ " +
            "QQQ QQQ" +
            "QQ   QQ" +
            " ");
        pushToPixels(hexTypes[hexTypeMap[hexTypeNames.Yellow]].symbol, "Q" +
            "  Q QQ " +
            "  Q   Q" +
            " Q  QQ " +
            " Q Q   " +
            "  Q Q  " +
            " Q QQ  " +
            "QQQ    " +
            " ");
        pushToPixels(hexTypes[hexTypeMap[hexTypeNames.Red]].symbol, " " +
            "  QQQ  " +
            "  Q Q  " +
            "QQQ QQQ" +
            "Q     Q" +
            "QQQ QQQ" +
            "  Q Q  " +
            "  QQQ  " +
            " ");
        pushToPixels(hexTypes[hexTypeMap[hexTypeNames.Blue]].symbol, "Q" +
            "QQQ QQQ" +
            "Q     Q" +
            "Q  Q  Q" +
            "Q QQQ Q" +
            "Q  Q  Q" +
            " Q   Q " +
            "  Q Q  " +
            "Q");
        pushToPixels(" ", " " +
            "       " +
            "       " +
            "       " +
            "       " +
            "       " +
            "       " +
            "       " +
            " ");
    })();

    var currentTool = "Pencil";
    var currentHexType = -1;
    var tools = [];
    var mouseOverTexts = [];

    var toolMargin = 5;
    var toolWidth = 30;
    var toolHeight = 30;
    var toolColumns = 7;
    var toolBoxLeft = toolMargin;//canvasW - .5 - (toolWidth + toolMargin) * toolColumns;

    for (var i = 1; i < hexTypes.length; i++) {
        var shortcutKey = "key_" + hexTypes[i].name;
        if (shortcutKey)

            tools.push({
                name: "",//"Draw: " + hexTypes[i].name,// + " (" + i.toString() + ")",
                hexType: i,
                color: hexTypes[i].color,
                symbol: hexTypes[i].symbol,
                shortcutKey: hexTypes[i].shortcutKey,//"key_" + hexTypes[i].name,
                click: function () {
                    currentHexType = this.hexType;
                    if (currentTool == "Thermo") {
                        currentTool = "Pencil";
                    }
                    drawBoard();
                },
                draw: function () {
                    if (currentHexType == this.hexType) {
                        drawToolShadow(this);
                    }
                    drawString(this.symbol, this.x + this.width / 2 - 6.5, this.y + 3.5, "black");
                }
            });
    }

    for (let placeholderI = 0; placeholderI < 4; placeholderI++) {
        tools.splice(3, 0, { name: "", color: "", click: function () { }, draw: function () { }, });
    }

    //for (var i = 1; i <= 9; i++) {
    //    tools.push({
    //        name: "Number " + i + " (" + i.toString() + ")",
    //        color: "gray",
    //        symbol: i,
    //        shortcutKey: "key_" + i,
    //        click: function () {
    //            currentHexType = this.hexType;
    //            drawBoard();
    //        },
    //        draw: function () {
    //            if (currentHexType == this.hexType) {
    //                drawToolShadow(this);
    //            }
    //            drawString(this.symbol, this.x + this.width / 2 - 3.5, this.y + 3.5, "black");
    //        }
    //    });
    //}
    tools.push({
        name: "Clear shading",
        color: "lightgray",
        shortcutKey: "delete",
        click: function (ctrlKey) {
            registerBoardChange();
            for (var x = 0; x < COLS; ++x) {
                for (var y = 0; y < ROWS; ++y) {
                    let cell = getBoardCell([x, y]);
                    if (cell && cell.hexTypeID > 0 && cell.hexTypeID <= 3) {
                        setBoardHexType([cell.x, cell.y], 1);
                    }
                }
            }
            drawBoard();
        },
        draw: "X",
    });
    tools.push({
        name: "Change board size",
        color: "lightgray",
        shortcutKey: "delete",
        click: function () {
            let sidelen = prompt("(Warning: this will delete everything off the board)\nNew board side length (3-11):", Math.ceil(COLS / 2));
            if (sidelen && Number.isInteger(Number(sidelen)) && Number(sidelen) >= 3 && Number(sidelen) <= 11) {
                COLS = Number(sidelen) * 2 - 1;
                ROWS = COLS;
                resetBoard();
                recalcDrawingOffsets();
                drawBoard();
            }
        },
        draw: "⌬",
    });

    tools.push({
        name: "Auto-unshade",
        color: "lightgray",
        click: function () {
            registerBoardChange();
            //from each shaded cell, shade off all None cells on all axes.
            for (var x = 0; x < COLS; ++x) {
                for (var y = 0; y < ROWS; ++y) {
                    let cell = getBoardCell([x, y]);
                    if (cell && cell.hexTypeID == 3) {
                        for (let dir = 0; dir < 6; dir++) {
                            let neighborCellCoords = [cell.x, cell.y];
                            let neighborCell = cell;
                            while (neighborCell) {
                                neighborCellCoords = getNeighborHexCoords(neighborCellCoords, dir);
                                neighborCell = getBoardCell(neighborCellCoords);
                                if (neighborCell) {
                                    if (neighborCell.hexTypeID == 1) {
                                        setBoardHexType(neighborCellCoords, 2);
                                    }
                                } else {
                                    break;
                                }
                            }
                        }
                    }
                }
            }

            drawBoard();
        },
        draw: "//",
    });

    //tools.push({
    //    name: "Pencil/Fill",
    //    color: "lightgray",
    //    click: function () {
    //        if (currentTool == "Pencil") {
    //            currentTool = "Fill";
    //        } else {
    //            currentTool = "Pencil";
    //        }
    //        drawBoard();
    //    },
    //    symbol: "⚫",
    //    draw: function () {
    //        if (currentTool == "Fill") {
    //            var offsets = [[1, 3], [4, -1], [9, 1], [9, 5], [7, 7], [3, 7], [5, 3]];
    //            drawToolShadow(this);
    //            for (var i = 0; i < offsets.length; i++) {
    //                drawString("⚫", this.x + .5 + offsets[i][0], this.y + .5 + offsets[i][1], "black");
    //            }
    //        } else if (currentTool == "Pencil") {
    //            drawToolShadow(this);
    //            drawString(this.symbol, this.x + this.width / 2 - 2.5, this.y + 3.5, "black");
    //        } else {
    //            drawString(this.symbol, this.x + this.width / 2 - 2.5, this.y + 3.5, "gray");
    //        }
    //    }
    //});
    //tools.push({
    //    name: "Fill",
    //    color: "lightgray",
    //    click: function () {
    //        currentTool = this.name;
    //        drawBoard();
    //    },
    //    draw: function () {
    //        if (currentTool == this.name) {
    //            drawToolShadow(this);
    //        }
    //        var offsets = [[1, 3], [4, -1], [9, 1], [9, 5], [7, 7], [3, 7], [5, 3]];
    //        for (var i = 0; i < offsets.length; i++) {
    //            drawString("⚫", this.x + .5 + offsets[i][0], this.y + .5 + offsets[i][1], "black");
    //        }
    //    }
    //});
    tools.push({
        name: "Solve for shaded cells (Ctrl+click to check all possible solutions)",
        color: "lightgray",
        //shortcutKey: "w",
        click: function (ctrlKey, shiftKey) {
            //populate all possibilities on the grid as display data.

            //if (event.key == 'w') shiftKey = true;

            registerBoardChange();
            console.time("prep");

            var starCount = 1;//prompt("# of stars per line/region");
            if (starCount == "") return;
            starCount = Number(starCount);
            while (!Number.isInteger(starCount)) {
                starCount = prompt("# of stars per line/region (Must be a number):");
                if (starCount == "") return;
                starCount = Number(starCount);
            }

            //let starCount = 2;

            let verifyCount = 0;
            let setCount = 0;
            let revertCount = 0;
            let finalCheckCount = 0;
            let solBoardCount = 0;
            let maxSolutionBoards = 50;

            let finalCheckGroups = [];

            var solutionBoards = [];

            let processingStartTime = Date.now();
            let timeLimitExceeded = false;

            function starBattleSolver(flatBoard, cellList, startingIdx) {
                //for each cell, 
                //if cell has no number
                //check if it's valid to set cell to 2 (ON).  AKA check for other cells on the axes with value 2.
                //if it's valid, set cell = 2.  else set to 1 and move on.
                //at the end, check if it's valid.  Should be able to just go through columns to check, as by definition others will be correct.  If not, return false and recurse.
                //recurse: if it's good (aka all columns have exactly 2 stars), return true;
                //else, set value to 1, then go on to the next X.
                for (let i = startingIdx || 0, len = cellList.length; i < len; i++) {
                    var cell = cellList[i];
                    if (cell.hexTypeID == 1) {
                        verifyCount++;

                        let isPossibleStar = true;
                        //let groupAvailability = [];
                        for (let group of cell.sudokuCellGroups) {
                            //let availability = group.totalValue - getNumStarsInGroup(flatBoard, group.cellCoords);
                            //  groupAvailability.push(availability);
                            //if (availability < 1) {
                            if (group.totalValue - getNumStarsInGroup(flatBoard, group.cellCoords) < 1) {

                                isPossibleStar = false;
                                break;
                            }
                        }
                        if (isPossibleStar) {
                            cell.hexTypeID = 3;

                            setCount++;
                            if (starBattleSolver(flatBoard, cellList, i + 1)) {
                                return true;
                            } else {
                                cell.hexTypeID = 1;

                                revertCount++;
                                if (Date.now() - processingStartTime > 15000) {
                                    if (timeLimitExceeded == false) {
                                        alert("15 second time limit exceeded.  Try shading a few cells to get started.");
                                        timeLimitExceeded = true;
                                    }
                                    return false;
                                }
                                //if (shiftKey) {
                                //    solutionBoards.push(JSON.stringify(flatBoard));
                                //    return true;
                                //}
                            }
                            //} else {
                            //    cell.number = 1;
                        }
                    }
                }

                //todo: better final check, showing that every line in each direction do have exactly starCount stars.
                //do final check that every star sees exactly N - 1 other stars.Surely there's a better way to do this, but oh well.
                finalCheckCount++;
                for (let group of finalCheckGroups) {
                    let hasCells = false;
                    let colStarCount = 0;
                    for (let cell of group) {
                        //if there are any cells, there must be starCount stars.
                        if (cell.hexTypeID > 0) {
                            hasCells = true;
                            if (cell.hexTypeID == 3) {
                                colStarCount++;
                            }
                        }
                    }
                    if (hasCells && colStarCount != starCount) {
                        return false;
                    }
                }

                //for (let i = 0, len = cellList.length; i < len; i++) {
                //    var cell = cellList[i];
                //    if (cell.hexTypeID > 0 && cell.number == 2) {
                //        for (let group of cell.sudokuCellGroups) {
                //            if (getNumStarsInGroup(flatBoard, group.cellCoords) + 1 != group.totalValue) {
                //                return false;
                //            }
                //        }
                //    }
                //}

                solBoardCount++;
                solutionBoards.push(JSON.stringify(flatBoard));
                if (!ctrlKey) {
                    return true;
                } else {
                    if (solutionBoards.length >= maxSolutionBoards) {
                        //dedupe boards
                        solutionBoards = dedupeArray(solutionBoards);

                        //truly unique
                        if (solutionBoards.length >= maxSolutionBoards) {
                            return true;
                        }
                    }
                }
            }

            setStarBattleCellGroups(starCount);

            var flatBoard = getBoardCopy();
            let cellList = [];
            for (let i = 0; i < COLS; i++) {
                let colGroup = [];
                for (let j = 0; j < ROWS; j++) {
                    let cell = flatBoard[i][j];
                    if (cell.hexTypeID > 0) {
                        cellList.push(cell);
                        colGroup.push(cell);
                    }
                }
                if (colGroup.length) {
                    finalCheckGroups.push(colGroup);
                }
            }
            //northwest to southeast, part 1.
            for (let i = 1; i < COLS; i++) {
                let colGroup = [];
                let coords = [i, 0];
                while (inBoard(coords[0], coords[1])) {
                    let cell = flatBoard[coords[0]][coords[1]];
                    if (cell.hexTypeID > 0) {
                        colGroup.push(cell);
                    }
                    coords = getNeighborHexCoords(coords, 0);
                }
                if (colGroup.length) {
                    finalCheckGroups.push(colGroup);
                }
            }
            //northwest to southeast, part 2.
            for (let i = 1; i < ROWS; i++) {
                let colGroup = [];
                let coords = [0, i];
                while (inBoard(coords[0], coords[1])) {
                    let cell = flatBoard[coords[0]][coords[1]];
                    if (cell.hexTypeID > 0) {
                        colGroup.push(cell);
                    }
                    coords = getNeighborHexCoords(coords, 0);
                }
                if (colGroup.length) {
                    finalCheckGroups.push(colGroup);
                }
            }
            //southwest to northeast, part 1.
            for (let i = 1; i < COLS; i++) {
                let colGroup = [];
                let coords = [i, ROWS - 1];
                while (inBoard(coords[0], coords[1])) {
                    let cell = flatBoard[coords[0]][coords[1]];
                    if (cell.hexTypeID > 0) {
                        colGroup.push(cell);
                    }
                    coords = getNeighborHexCoords(coords, 1);
                }
                if (colGroup.length) {
                    finalCheckGroups.push(colGroup);
                }
            }
            //southwest to northeast, part 2.
            for (let i = 1; i < ROWS; i++) {
                let colGroup = [];
                let coords = [0, i];
                while (inBoard(coords[0], coords[1])) {
                    let cell = flatBoard[coords[0]][coords[1]];
                    if (cell.hexTypeID > 0) {
                        colGroup.push(cell);
                    }
                    coords = getNeighborHexCoords(coords, 1);
                }
                if (colGroup.length) {
                    finalCheckGroups.push(colGroup);
                }
            }

            //todo maybe: check northeast/southwest and northwest/southeast lines.

            //naively turn off cells that are already fulfilled.
            for (let group of finalCheckGroups) {
                let colStarCount = 0;
                for (let cell of group) {
                    //if there are any cells, there must be starCount stars.
                    if (cell.hexTypeID > 0) {
                        if (cell.hexTypeID == 3) {
                            colStarCount++;
                            for (let ncoords of getAllNeighborHexCoords([cell.x, cell.y])) {
                                let c2 = getBoardCell(ncoords);
                                if (c2 && c2.hexTypeID > 0) {
                                    c2.hexTypeID = 2;
                                }
                            }
                        }
                    }
                }
                if (colStarCount == starCount) {
                    for (let cell of group) {
                        //if there are any cells, there must be starCount stars.
                        if (cell.hexTypeID == 1) {
                            registerBoardChange();
                            let c = getBoardCell([cell.x, cell.y]);
                            c.hexTypeID = 2;
                        }
                    }
                }
            }


            //shuffleArray(cellList);

            console.timeEnd("prep");
            console.time("solve");
            starBattleSolver(flatBoard, cellList);
            if (timeLimitExceeded) {
                return;
            }
            console.timeEnd("solve");
            console.time("update");

            //todo: reduce possible solutionboards - for some reason it's allowing duplicates.
            //let jsonBoards = [];
            //for (var sboard in solutionboards) {
            //    jsonBoards = JSON.stringify(sboard);
            //}
            //solutionBoards = dedupeArray(jsonBoards);

            let unpackedSolutionBoards = [];
            for (var solBoard of solutionBoards) {
                unpackedSolutionBoards.push(JSON.parse(solBoard));
            }

            if (solutionBoards.length && solutionBoards.length != maxSolutionBoards) {
                for (let i = 0; i < COLS; i++) {
                    for (let j = 0; j < ROWS; j++) {
                        var cell = getBoardCell([i, j]);
                        if (cell && cell.hexTypeID > 0 && cell.hexTypeID < 3) {
                            var isAlwaysShaded = true;
                            var isAlwaysUnshaded = true;
                            for (let solBoard of unpackedSolutionBoards) {
                                if (solBoard[i][j].hexTypeID == 3) {
                                    isAlwaysUnshaded = false;
                                } else {
                                    isAlwaysShaded = false;

                                }
                            }
                            if (isAlwaysShaded) {
                                setBoardHexType([i, j], 3);
                            } else if (isAlwaysUnshaded) {
                                setBoardHexType([i, j], 2);
                            }
                        }
                    }
                }
            }

            console.timeEnd("update");

            console.log("verifies:" + verifyCount);
            console.log("sets:" + setCount);
            console.log("reverts:" + revertCount);
            console.log("final checks:" + finalCheckCount);
            solBoardCount = solutionBoards.length;
            console.log("solution board count:" + solBoardCount);

            if (ctrlKey) {
                console.log(solBoardCount + (solBoardCount == maxSolutionBoards ? "+" : "") + " solution(s)");
                $("#log").val("This shaded cell layout has " + solBoardCount + (solBoardCount == maxSolutionBoards ? "+" : "") + " solution" + (solBoardCount == 1 ? "" : "s"));
            } else {
                if (solBoardCount == 0) {
                    $("#log").val("This shaded cell layout has 0 solutions");
                } else if (solBoardCount == 1) {
                    $("#log").val("This shaded cell layout has at least 1 solution");
                } else {
                    $("#log").val("This shaded cell layout has " + solBoardCount + (solBoardCount == maxSolutionBoards ? "+" : "") + " solution" + (solBoardCount == 1 ? "" : "s"));
                }

            }

            drawBoard();
        },
        draw: "✓",
    });

    //tools.push({
    //    name: "Thermo",
    //    color: "lightgray",
    //    click: function () {
    //        currentTool = this.name;
    //        drawBoard();
    //    },
    //    draw: function () {
    //        if (currentTool == this.name) {
    //            drawToolShadow(this);
    //        }
    //        drawString("T", this.x + 4.5, this.y + 3.5, "black");
    //    }
    //});

    //tools.push({
    //    name: "Flip Horizontally (Ctrl+click for Vertically).  This will reset the Undo/Redo.",
    //    color: "lightgray",
    //    //shortcutKey: "^up",
    //    click: function (ctrlKey) {
    //        let boardCopy = getBoardCopy(board);
    //        for (let colIdx = 0; colIdx < COLS; colIdx++) {
    //            for (let rowIdx = 0; rowIdx < ROWS; rowIdx++) {
    //                if (ctrlKey) {
    //                    if (colIdx % 2 == 0) {
    //                        if (inBoard(colIdx, ROWS - rowIdx)) {
    //                            board[colIdx][rowIdx] = boardCopy[colIdx][ROWS - rowIdx];
    //                        }
    //                    } else {
    //                        if (inBoard(colIdx, ROWS - 1 - rowIdx)) {

    //                            board[colIdx][rowIdx] = boardCopy[colIdx][ROWS - 1 - rowIdx];
    //                        }
    //                    }
    //                } else {
    //                    board[colIdx][rowIdx] = boardCopy[COLS - 1 - colIdx][rowIdx];
    //                }
    //            }
    //        }
    //        drawBoard();
    //        importBoard();
    //    },
    //    draw: "><",
    //});

    //tools.push({
    //    name: "Placeholder",
    //    color: "lightgray",
    //    //shortcutKey: "^up",
    //    click: function () {
    //    },
    //    draw: "?",
    //});


    tools.push({
        name: "Open as URL",
        color: "lightgray",
        //shortcutKey: "^up",
        click: function () {
            window.open("Sonari.html?boardDef=" + escape(getBoardDef()));
        },
        draw: "🖫",
    });

    for (let placeholderI = 0; placeholderI < 9; placeholderI++) {
        tools.push( { name: "", color: "", click: function () { }, draw: function () { }, });
    }
    let solvingTool = {
        name: "Solve: click to shade/unshade and modify ring sizes",
        color: solvingGradient,
        symbol: "",//"~",
        shortcutKey: "+`",
        click: function () {
            currentHexType = -1;
            drawBoard();
        },
        draw: function () {
            if (currentHexType == -1) {
                drawToolShadow(this);
            }
            drawString(this.symbol, this.x + this.width / 2 - 3.5, this.y + 3.5, "black");
        }
    }
    tools.push(solvingTool);

    //layout tools in columnar grid.
    for (var i = 0; i < tools.length; i++) {
        var tool = tools[i];
        tool.x = toolBoxLeft + (toolWidth + toolMargin) * (i % toolColumns);
        tool.y = toolMargin - .5 + (toolHeight + toolMargin) * (Math.floor(i / toolColumns));
        tool.height = toolHeight;
        tool.width = toolWidth;
    }

    //create gradient for first tool, the solving tool.
    var solvingGradient = ctx.createLinearGradient(solvingTool.x,
        solvingTool.y,
        solvingTool.x + solvingTool.width,
        solvingTool.y + solvingTool.height);

    solvingGradient.addColorStop(.3, "#DEB887");
    solvingGradient.addColorStop(0.35, "#8b4513");
    solvingGradient.addColorStop(0.65, "#8b4513");
    solvingGradient.addColorStop(.7, "#FFFFFF");
    solvingTool.color = solvingGradient;

    function promptDescription() {
        var d = "~";
        var promptText = "Description";
        while (d.indexOf("~") > -1) {
            d = prompt(promptText, description);
            if (d == null) { return; }
            promptText = "Description (cannot contain '~'):";
        }
        registerBoardChange();
        description = d;
        $("#hTitle").text(description);
        drawBoard();
    }

    //var descriptionTool = {
    //    name: "Description",
    //    color: "#DDDDDD",
    //    click: function () {
    //        var d = "~";
    //        var promptText = "Description";
    //        while (d.indexOf("~") > -1) {
    //            d = prompt(promptText, description);
    //            if (d == null) { return; }
    //            promptText = "Description (cannot contain '~'):";
    //        }
    //        registerBoardChange();
    //        description = d;
    //        drawBoard();
    //    },
    //    draw: function () {
    //        drawString(description, this.x + 1.5, this.y + 1.5, "black", null, this.width);
    //    },
    //    x: tools[0].x,
    //    y: tools[tools.length - 1].y + toolHeight + toolMargin,//toolMargin - .5,
    //    height: tools[tools.length - 1].y + toolHeight + .5,
    //    //width: canvasW - .5 - (toolWidth + toolMargin,
    //    width: canvasW - .5 - tools[0].x - toolMargin
    //}
    //tools.push(descriptionTool);

    for (var i = 0; i < tools.length; i++) {
        var tool = tools[i];
        addMouseOverText(tool.name, "tool", tool.x, tool.y, tool.x + tool.width, tool.y + tool.height);
    }

    //check if there's a board Def in the URL
    const urlParams = new URLSearchParams(window.location.search);
    let boardDef = urlParams.get('boardDef')
    //if (!boardDef) {
    //get it from local storage.
    //boardDef = window.localStorage.getItem("boardDef");
    //}
    if (boardDef) {
        //$("#txtBoardDefinition").val(boardDef);
        importBoard();
    } else {
        resetBoard();
        recalcDrawingOffsets();
        drawBoard();
    }

    //$('#btnImport').click(importBoard);
    $('#hTitle').click(promptDescription);
});

