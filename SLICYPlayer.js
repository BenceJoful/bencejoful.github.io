/*todo: 
 * compress in url.
 * 
 * allow deleting in set mode for different shaped grids
 * allow setting row/column size.
 * toolbar doesn't scroll, with status bar for hover text.  Redraws itself only.
 * check function.
 * 
 * Make mobile-friendly: allow double tapping/long tapping and swiping to shade areas.  allow two-finger swipe for scrolling.
*/

'use strict';
$(document).ready(function () {

    class Cell {
        hexTypeID = 0;
        number = 0;
        sudokuCellGroups = [];
        x = 0;
        y = 0;
        isUnshaded = false;
        isShaded = false;
        constructor(x, y, hexTypeID, number, sudokuCellGroups, isUnshaded, isShaded) {
            this.x = x;
            this.y = y;
            this.hexTypeID = hexTypeID;
            this.number = number;
            this.sudokuCellGroups = sudokuCellGroups;
            this.isUnshaded = isUnshaded;
            this.isShaded = isShaded;
        }
    }
    function getCellClone(cell) {
        return new Cell(cell.x, cell.y, cell.hexTypeID, cell.number, cell.sudokuCellGroups, cell.isUnshaded, cell.isShaded);
    }
    function getCellColor(cell) {
        if (cell.isShaded) {
            return SOLVING_SHADED;
        } else if (cell.isUnshaded) {
            return SOLVING_UNSHADED;
        } else if (solveMode) {
            return "white";
        } else {
            return hexTypes[cell.hexTypeID].color;
        }
    };

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
        return [drawCoords[0] + HEX_W * .65 + .5, drawCoords[1] + HEX_H / 2];
    };

    function setPathCoords(x, y, percent) {
        if (percent == undefined) percent = 1;
        let lineSegments = [];
        ctx.beginPath();
        for (var i = 0; i < 6; i++) {
            let lsx = x + HEX_PATH[i][0] * percent;
            let lsy = Math.round(y + HEX_PATH[i][1] * percent) + .5;
            lineSegments.push([lsx, lsy]);
        }
        for (var ls of lineSegments) {
            ctx.lineTo(ls[0], ls[1]); // no need to moveTo first, since the initial lineTo is treated as a moveTo.
        }
        ctx.closePath();
        return lineSegments;
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
        return drawBlockCoords(drawCoords[0] + offsetX, drawCoords[1] + offsetY, fillStyle, stroke);
    };
    function drawBlockCoords(x, y, fillStyle, stroke) {
        let lineSegments = setPathCoords(x, y);
        if (fillStyle) {
            ctx.fillStyle = fillStyle;
            ctx.fill();
        }
        if (stroke) {
            ctx.stroke();
        }
        return lineSegments;
    }

    function drawCell(cell) {
        if (!solveMode || cell.hexTypeID > 1) {
            var lineSegments = drawBlock(cell.x, cell.y, getCellColor(cell));//get line shapes

            var displayValue = "";
            if (cell.number) {
                if (cell.number == 7) {
                    displayValue = " 0";
                } else {
                    displayValue = " " + cell.number.toString();
                }
            }
            let coords = lineSegments[3];
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'black';
            drawString(displayValue.substr(0, 3), Math.round(coords[0]), Math.round(coords[1] + 6), "black");

            var thickBorders = [];
            var thinBorders = [];
            //draw borders if neighboring cell has different hextypeid.
            for (let dir = 0; dir < 6; dir++) {
                let borderCoords = [lineSegments[dir][0], lineSegments[dir][1], lineSegments[(dir + 1) % 6][0], lineSegments[(dir + 1) % 6][1]];
                let ncell = getBoardCell(getNeighborHexCoords([cell.x, cell.y], dir));
                if (!ncell || (ncell && ncell.hexTypeID != cell.hexTypeID)) {
                    thickBorders.push(borderCoords);
                } else {
                    //draw a nice gray line.  first wipe out the previous line though.
                    //let nCellColor = hexTypes[ncell.hexTypeID].color;
                    thinBorders.push(borderCoords);//.concat(nCellColor));
                    //    ctx.beginPath();
                    //    ctx.lineTo(lineSegments[dir][0], lineSegments[dir][1]);
                    //    ctx.lineTo(lineSegments[(dir + 1) % 6][0], lineSegments[(dir + 1) % 6][1]);

                    //    ctx.lineWidth = 4;
                    //    ctx.strokeStyle = ;
                    //    ctx.stroke();
                    //    ctx.lineWidth = 1;
                    //    ctx.strokeStyle = 'lightgray';
                    //    ctx.stroke();
                }
            }

            //ctx.lineWidth = 4;
            //for (var border of thinBorders) {
            //    ctx.beginPath();
            //    ctx.strokeStyle = border[4];
            //    ctx.moveTo(border[0], border[1]);
            //    ctx.lineTo(border[2], border[3]);
            //    ctx.stroke();
            //}

            ctx.beginPath();
            for (var border of thinBorders) {
                ctx.moveTo(border[0], border[1] - .5);
                ctx.lineTo(border[2], border[3] - .5);
            }
            ctx.lineWidth = 2;
            ctx.strokeStyle = "lightgray";
            ctx.stroke();


            ctx.beginPath();
            for (var border of thickBorders) {
                ctx.moveTo(border[0], border[1]);
                ctx.lineTo(border[2], border[3]);
            }
            ctx.lineWidth = 5;
            ctx.strokeStyle = 'black';
            ctx.stroke();

        }
    }
    function resetBoard() {
        board = [];
        for (var x = 0; x < COLS; ++x) {
            board[x] = [];
            for (var y = 0; y < ROWS; ++y) {
                setBoardHexType([x, y], 1);
            }
        }

        description = "Untitled";
        $("#hTitle").text(description);
        undoboards = [];
        redoboards = [];

    }

    function importBoard() {
        //let boardDef = $("#txtBoardDefinition").val();
        //window.localStorage.setItem("boardDef", boardDef);
        boardDef = boardDef.split("~");
        COLS = Number(boardDef.shift());
        ROWS = Number(boardDef.shift());
        resetBoard();
        description = boardDef.shift();
        $("#hTitle").text(description);
        var lines = boardDef[0].replace(/\./g, "@").split("_");
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
                        let lowercaseLineVal = lineVal.toLowerCase();
                        if (lowercaseLineVal != lineVal) {
                            line.splice(j, 1, lowercaseLineVal, lowercaseLineVal);
                            j--;
                        } else {
                            var boardvalue = lineVal.charCodeAt(0) - 96;
                            if (boardvalue > 8) {
                                boardvalue -= 7;
                                if (boardvalue > 8) {
                                    board[j][i].isUnshaded = true;
                                    boardvalue -= 7;
                                } else {
                                    board[j][i].isShaded = true;
                                }
                            }
                            setBoardHexType([j, i], boardvalue);
                        }
                    }
                }
            }
        }
        recalcDrawingOffsets();
        drawBoard();
    }
    function drawBoard() {
        //pencilCellCount = 0;
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'black';
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        //ctx.fillStyle = "pink";
        //ctx.fillRect(0, 0, canvas.width, canvas.height);

        //clear out mouseovers that were here before.
        for (var i = mouseOverTexts.length - 1; i >= 0; i--) {
            if (mouseOverTexts[i].type != "tool") {
                mouseOverTexts.splice(i, 1);
            }
        }

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
                }
            }
        }

        // stroke the filled blocks with a shadow.
        //ctx.shadowBlur = 3;
        //ctx.lineWidth = 3;
        //for (var i = 0; i < filledBlocks.length; i++) {
        //    var x = filledBlocks[i][0];
        //    var y = filledBlocks[i][1];

        //    //draw block shadow, preparing for real block next.
        //    drawBlock(x, y, null, null, null, true);
        //}
        //ctx.shadowBlur = 0;

        if (filledBlocks.length > 0) {

            for (var i = 0; i < filledBlocks.length; i++) {
                var x = filledBlocks[i][0];
                var y = filledBlocks[i][1];
                var cell = board[x][y];
                drawCell(cell);

                //addMouseOverText(hexType.name + " (" + x + "," + y + "): " + boardDisplay[x][y], "board", coords[0] + 6, coords[1] + 3, coords[0] + 5 + 16, coords[1] + 3 + 16);
                //draw bounding box:
                //ctx.shadowBlur = 0; ctx.lineWidth = 1; ctx.strokeRect(coords[0] + 5, coords[1] + 3, 16, 16);

            }
        }
        //reset drawing context
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'black';

        //for (var thermo of thermos) {
        //    //draw bulb
        //    var thermocoords = thermo[0];
        //    var [drawX, drawY] = getHexCenter(thermocoords[0], thermocoords[1]);
        //    ctx.fillStyle = "rgba(150,150,150,100)";
        //    ctx.beginPath();
        //    ctx.arc(drawX, drawY, HEX_H / 3, 0, 2 * Math.PI);
        //    ctx.fill();

        //    ctx.strokeStyle = "rgba(150,150,150,100)";
        //    ctx.lineWidth = 8;
        //    ctx.beginPath();
        //    ctx.moveTo(drawX, drawY);
        //    for (let tidx = 1; tidx < thermo.length; tidx++) {
        //        let nextthermocoords = thermo[tidx];
        //        //draw a line from prev to next.
        //        [drawX, drawY] = getHexCenter(nextthermocoords[0], nextthermocoords[1]);
        //        ctx.lineTo(drawX, drawY);
        //        thermocoords = nextthermocoords;

        //    }
        //    ctx.stroke();
        //}


        //ctx.lineWidth = 1;
        drawToolbox();

    }

    function getBoardDef() {
        //display board text further down in the webpage.
        var lines = [];
        var boardWidth = 0;
        var boardHeight = 0;
        for (let y = 0; y < board[0].length; ++y) {
            var line = [];
            var lineBuffer = "";
            for (let x = 0; x < board.length; ++x) {
                let cell = board[x][y]
                var boardValue = String.fromCharCode(96 + cell.hexTypeID + (cell.isShaded ? 7 : 0) + (cell.isUnshaded ? 14 : 0));
                if (cell.hexTypeID > 0) {
                    var number = board[x][y].number;
                    if (number > 0) {
                        lineBuffer += number.toString();
                    }
                }
                if (boardValue.length == 1 && boardValue == line[line.length - 1]) {//same as last, replace rather than append.
                    line[line.length - 1] = boardValue.toUpperCase();
                } else {
                    lineBuffer += boardValue;
                }
                if (cell.hexTypeID > 0) {
                    if (x > boardWidth) {
                        boardWidth = x;
                    }
                    if (y > boardHeight) {
                        boardHeight = y;
                    }
                    line.push(lineBuffer);
                    lineBuffer = "";
                }
            }
            lines.push(line.join("") || "@");
        }
        lines.length = boardHeight + 1;

        var boardDef = COLS + "~" + ROWS + "~" + description + "~" + lines.join("_").replace(/@/g, ".");//+ JSON.stringify(thermos) + "~"
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
                drawString(tool.draw, tool.x + tool.width / 2 - 6.5, tool.y + 3, "black");
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
    var mouseMovingShaded = "";//"", "Shaded", "Unshaded", "None"
    var showingMouseOver = false;
    function handleMouse(e, eventType) {
        e.preventDefault();
        e.stopPropagation();

        var canvasOffset = $canvas.offset();
        var offsetX = canvasOffset.left;
        var offsetY = canvasOffset.top;
        var mouseX = parseInt(e.pageX - offsetX);
        var mouseY = parseInt(e.pageY - offsetY);
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
                let mtX = 218;
                let mtY = 5;
                ctx.clearRect(mtX - 5, mtY - 5, canvasW - mtX, 38);
                drawString(mouseOverText, mtX, mtY, "black", "white");
                //drawString(mouseOverText, mouseX, mouseY + 20, "black", "white");
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
                if (currentTool == "Pencil") {
                    var boardJSON = getBoardJSON();
                    mouseMovingShaded = "";
                    if (usePencil(mouseX, mouseY, e.shiftKey, e.ctrlKey)) {
                        registerBoardChange(boardJSON);
                    }
                }
            }
        } else if (eventType == "up") {
            isMouseDown = false;
            mouseMovingShaded = "";
            prevMouseX = null;
            prevMouseY = null;
        }
    }
    function getBoardJSON() {
        return JSON.stringify({ "desc": description, "board": board });
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
    }

    var prevMouseX = null;
    var prevMouseY = null;
    //var pencilCellCount = 0;
    function usePencil(mouseX, mouseY, shiftKey, ctrlKey) {
        var changed = false;
        if (isMouseDown) {
            var hexTypeID = currentHexType;
            if (currentHexType == -1) {
                //solve tool: get current hex to determine proper action.
                var hexCoords = getMouseHexCoords(mouseX, mouseY);
                if (inBoard(hexCoords[0], hexCoords[1])) {
                    let targetCell = board[hexCoords[0]][hexCoords[1]];
                    if (targetCell && targetCell.hexTypeID) {

                        if (mouseMovingShaded == "") {//first time (not dragging), so calculate based on targetCell.
                            if (shiftKey) {
                                mouseMovingShaded = "None";
                            } else if (targetCell.isUnshaded) {
                                if (event.buttons == 2) {
                                    //Unshaded, set to Shaded
                                    mouseMovingShaded = "Shaded";
                                } else {
                                    //Unshaded, set to None
                                    mouseMovingShaded = "None";
                                }
                            } else if (targetCell.isShaded) {
                                if (event.buttons == 2) {
                                    //Shaded, set to None
                                    mouseMovingShaded = "None";
                                } else {
                                    //Shaded, set to Unshaded
                                    mouseMovingShaded = "Unshaded";
                                }
                            } else {
                                if (event.buttons == 2) {
                                    //None, set to Unshaded
                                    mouseMovingShaded = "Unshaded";
                                } else {
                                    //None, set to Shaded
                                    mouseMovingShaded = "Shaded";
                                }
                            }
                        }
                        switch (mouseMovingShaded) {
                            case "None": targetCell.isUnshaded = false; targetCell.isShaded = false; break;
                            case "Shaded": targetCell.isUnshaded = false; targetCell.isShaded = true; break;
                            case "Unshaded": targetCell.isUnshaded = true; targetCell.isShaded = false; break;
                        }
                        if (description == "SL2KY") {
                            checkSL2KYAnswer();
                        }
                        //immediately redraw this cell only.
                        drawCell(targetCell);
                        return true;
                    }
                }
            } else {
                if (shiftKey) {
                    hexTypeID = 1;
                }
                //if (hexTypeID != 0) {
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
                        if (cell && cell.hexTypeID > 0 && cell.hexTypeID != hexTypeID) {

                            var hexType = hexTypes[hexTypeID];
                            if (hexType.color == "Plum") {//the numbers.
                                setBoardNumber([x, y], (hexType.symbol == "0" ? 7 : Number(hexType.symbol)))
                            }
                            else {
                                setBoardHexType([x, y], hexTypeID);
                            }
                            changed = true;

                            //pencilCellCount++;
                            //if (pencilCellCount == 20) {
                            //    drawBoard();
                            //} else {
                            drawCell(cell);
                            //}

                        }
                    }
                }
                //drawBoard();

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
            cell = new Cell(hexCoords[0], hexCoords[1], hexTypeID, 0, null, false, false);
            board[hexCoords[0]][hexCoords[1]] = cell;
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
        ctx.fillStyle = color;
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
            if (!handled && !solveMode) {
                if (keyname == 'left') {
                    if (currentHexType == 2) {
                        currentHexType = -1;
                    } else if (currentHexType > 2) {
                        currentHexType--;
                    }
                    drawBoard();
                }
                else if (keyname == 'right') {
                    if (currentHexType < hexTypes.length - 1) {
                        currentHexType = Math.max(2, currentHexType + 1);
                    }
                    drawBoard();
                }
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
    var linelen = 20;//6;//20;//
    var HEX_W;
    var HEX_H;
    var HEX_PATH;
    var canvasDrawingXOff = 0;
    var canvasDrawingYOff = 0;
    function recalcDrawingOffsets() {
        //linelen = (canvasH - 20) / (COLS * 2 / 1.1547);//doesn't work for huge canvases.
        linelen = (canvasW - 20) / (COLS * 2 / 1.25);
        HEX_W = linelen * 1.5;
        HEX_H = linelen * 2 / 1.1547;
        HEX_PATH = [
            [linelen * 1.5, HEX_H],
            [linelen * 2.0, HEX_H / 2],
            [linelen * 1.5, 0],
            [linelen * 0.5, 0],
            [0, HEX_H / 2],
            [linelen * 0.5, HEX_H],
        ];

        canvasDrawingXOff = canvasW / 2 - (HEX_W * COLS) / 2;
        canvasDrawingYOff = 40;//canvasH / 2 - HEX_H * COLS / 2 - ((Math.ceil(COLS / 2)) % 2 ? 0 : HEX_H / 2);

        //set canvas height.
        canvas.height = canvasDrawingYOff + (ROWS + 1) * HEX_H;
        createCanvasContext();
    }

    var COLS = 15;//19;//
    var ROWS = 15;//13;//19;// //N rows, plus creating a V at the bottom.  with COLS = 11, this means 5 extra rows.
    var board;
    var undoboards;//used for undo
    var redoboards;//used for redo
    var solveMode = true;
    var SOLVING_SHADED = "MidnightBlue";
    var SOLVING_UNSHADED = "LightSteelBlue";

    function toggleSolveMode() {
        solveMode = !solveMode;
        if (solveMode) {
            currentHexType = -1;
        }
        createTools();
        drawBoard();
    }


    var description;

    var ctx;
    function createCanvasContext() {

        ctx = canvas.getContext('2d');
        ctx.lineCap = "round";
        ctx.shadowColor = 'black';
        ctx.font = '20px sans-serif';
    }
    createCanvasContext();

    var $canvas = $(canvas);

    $canvas.mousemove(function (e) { handleMouse(e, "move"); });
    $canvas.mousedown(function (e) { handleMouse(e, "down"); });
    $canvas.mouseup(function (e) { handleMouse(e, "up"); });

    var hexTypeNames = {
        "None": "None",
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
            color: "gray",
            symbol: "",
        }, {
            name: hexTypeNames.None,
            color: "white",
            symbol: "",
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
    var toolBoxLeft = toolMargin + .5;//canvasW - .5 - (toolWidth + toolMargin) * toolColumns;

    function createTools() {
        tools = [];


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
                if (confirm("This will clear all your progress. Really remove all shading?")) {
                    registerBoardChange();
                    for (var x = 0; x < COLS; ++x) {
                        for (var y = 0; y < ROWS; ++y) {
                            let cell = getBoardCell([x, y]);
                            if (cell) {
                                cell.isShaded = false;
                                cell.isUnshaded = false;
                            }
                        }
                    }
                    drawBoard();
                }
            },
            draw: "X",
        });

        //tools.push({
        //    name: "Change board size",
        //    color: "lightgray",
        //    shortcutKey: "delete",
        //    click: function () {
        //        let sidelen = prompt("(Warning: this will delete everything off the board)\nNew board side length (3-11):", Math.ceil(COLS / 2));
        //        if (sidelen && Number.isInteger(Number(sidelen)) && Number(sidelen) >= 3 && Number(sidelen) <= 11) {
        //            COLS = Number(sidelen) * 2 - 1;
        //            ROWS = COLS;
        //            resetBoard();
        //            recalcDrawingOffsets();
        //            drawBoard();
        //        }
        //    },
        //    draw: "⌬",
        //});
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
            name: "Save changes to new tab/URL",
            color: "lightgray",
            //shortcutKey: "^up",
            click: function () {
                window.open("SLICYPlayer.html?boardDef=" + escape(getBoardDef()));
            },
            draw: "🖫",
        });
        tools.push({
            name: solveMode ? "Edit mode" : "Solve mode",
            color: "lightgray",
            //shortcutKey: "^up",
            click: function () {
                toggleSolveMode();
            },
            draw: "✎",
        });

        tools.push({
            name: "Undo (or Ctrl+z)(+Shift to undo 10 steps at a time)",
            color: "lightgray",
            //shortcutKey: "^up",
            click: function (ctrlKey, shiftKey) {
                undoBoardChange(shiftKey ? 10 : 1);
                drawBoard();
            },
            draw: "<",
        });
        tools.push({
            name: "Redo (or Ctrl+z)(+Shift to redo 10 steps at a time)",
            color: "lightgray",
            //shortcutKey: "^up",
            click: function (ctrlKey, shiftKey) {
                redoBoardChange(shiftKey ? 10 : 1);
                drawBoard();
            },
            draw: ">",
        });


        //tools.push({
        //    name: "About",
        //    color: "lightgray",
        //    click: function () {
        //        alert(
        //            "Sonari setter/solver by BenceJoful\nVersion 0.0.1\nOriginal puzzle genre by Qinlux\n\nKeyboard shortcuts: Ctrl+z"
        //        );
        //    },
        //    draw: "@",
        //});

        let solvingTool = {
            name: "Solve: click to shade/unshade (+Shift to erase)",
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
                drawString(this.symbol, this.x + this.width / 2 - 6.5, this.y + 3.5, "black");
            }
        }
        if (!solveMode) {
            tools.push(solvingTool);
        }
        if (solveMode) {
            solvingTool = {
                name: "Choose Solving Colors",
                color: solvingGradient,
                //shortcutKey: "^up",
                click: function () {
                    let shaded = prompt("Shaded Color (#XXXXXX or CSS color): ", SOLVING_SHADED);
                    if (shaded) {
                        let unshaded = prompt("Unshaded Color (#XXXXXX or CSS color): ", SOLVING_UNSHADED);
                        if (unshaded) {
                            SOLVING_SHADED = shaded;
                            SOLVING_UNSHADED = unshaded;
                        }
                    }
                    createTools();
                    drawBoard();
                },
                draw: "C",
            }
            tools.push(solvingTool);
        }
        if (!solveMode) {

            for (var i = 2; i < hexTypes.length; i++) {
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
        }
        let toolRowBreaks = [];
        let toolRowBreak = toolRowBreaks.shift();
        //layout tools in columnar grid.
        let toolX = toolBoxLeft;
        let toolY = toolMargin - .5;
        for (var i = 0; i < tools.length; i++) {
            var tool = tools[i];
            tool.height = toolHeight;
            tool.width = toolWidth;
            tool.x = toolX;
            tool.y = toolY;

            toolX += toolMargin + toolWidth;
            if (i == toolRowBreak) {
                toolX = toolBoxLeft;
                toolY += toolMargin + toolHeight;
                toolRowBreak = toolRowBreaks.shift();
            }
        }

        ////layout tools in columnar grid.
        //for (var i = 0; i < tools.length; i++) {
        //    var tool = tools[i];
        //    tool.x = toolBoxLeft + (toolWidth + toolMargin) * (i % toolColumns);
        //    tool.y = toolMargin - .5 + (toolHeight + toolMargin) * (Math.floor(i / toolColumns));
        //    tool.height = toolHeight;
        //    tool.width = toolWidth;
        //}

        //create gradient for first tool, the solving tool.
        var solvingGradient = ctx.createLinearGradient(solvingTool.x,
            solvingTool.y,
            solvingTool.x + solvingTool.width,
            solvingTool.y + solvingTool.height);

        solvingGradient.addColorStop(.3, "#FFFFFF");
        solvingGradient.addColorStop(0.35, SOLVING_SHADED);
        solvingGradient.addColorStop(0.65, SOLVING_SHADED);
        solvingGradient.addColorStop(.7, SOLVING_UNSHADED);
        solvingTool.color = solvingGradient;

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
    }
    createTools();
    //check if there's a board Def in the URL
    const urlParams = new URLSearchParams(window.location.search);
    let boardDef = urlParams.get('boardDef');
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
        toggleSolveMode();
    }

    function promptDescription() {
        var d = "~";
        var promptText = "Description";
        while (d.indexOf("~") > -1 || d.indexOf("_") > -1) {
            d = prompt(promptText, description);
            if (d == null) { return; }
            promptText = "Description (cannot contain '~' or '_'):";
        }
        registerBoardChange();
        description = d;
        $("#hTitle").text(description);
        drawBoard();
    }

    //$('#btnImport').click(importBoard);
    $('#hTitle').click(promptDescription);

    setInterval(function () { if (!solveMode && !showingMouseOver) { drawBoard() } }, 2000);

    function hashString(s) {
        var hash = 0, i, chr;
        if (s.length === 0) return hash;
        for (i = 0; i < s.length; i++) {
            chr = s.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    };

    function checkSL2KYAnswer() {
        //check if shading is correct.
        var boardShading = '';
        for (var x = 0; x < COLS; ++x) {
            for (var y = 0; y < ROWS; ++y) {
                let cell = getBoardCell([x, y]);
                if (cell && cell.isShaded) {
                    boardShading += "1";
                }
                else {
                    boardShading += "0";
                }
            }
        }
        if (hashString(boardShading) == -182606930) {
            setTimeout(function () { alert("Congratulations, you solved the puzzle!") }, 1);
            isMouseDown = false;
        }
    }
});

